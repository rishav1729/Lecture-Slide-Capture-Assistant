class SlideCapture {
    constructor() {
      this.isCapturing = false;
      this.captureInterval = null;
      this.slides = [];
      this.lastScreenshot = null;
      this.lastTextContent = '';
      this.stabilityCounter = 0;
      this.requiredStability = 2; // Reduced from 3
      this.captureDelay = 1500; // Reduced from 2000
      this.similarityThreshold = 0.85; // Reduced from 0.88
      this.folderPath = '';
      
      // Enhanced features
      this.frameHistory = [];
      this.maxFrameHistory = 5;
      this.mlModel = null;
      this.textChangeThreshold = 0.3; // Reduced from 0.4
      this.lastSlideTime = 0;
      this.minSlideInterval = 3000; // Minimum 3 seconds between slides
      
      console.log('YouTube Slide Capture: Initializing with enhanced features');
      this.initializeMLModel();
      this.initializeUI();
    }
  
    async initializeMLModel() {
      try {
        // Load TensorFlow.js
        if (!window.tf) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        
        // Create simple transition detection model
        this.mlModel = tf.sequential({
          layers: [
            tf.layers.conv2d({
              inputShape: [32, 32, 3],
              filters: 16,
              kernelSize: 3,
              activation: 'relu'
            }),
            tf.layers.maxPooling2d({ poolSize: 2 }),
            tf.layers.flatten(),
            tf.layers.dense({ units: 32, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
          ]
        });
  
        this.mlModel.compile({
          optimizer: 'adam',
          loss: 'binaryCrossentropy'
        });
  
        console.log('ML Model initialized');
      } catch (error) {
        console.log('TensorFlow.js not available, using fallback methods');
      }
    }
  
    initializeUI() {
      const existingPanel = document.getElementById('slide-capture-panel');
      if (existingPanel) existingPanel.remove();
      
      const controlPanel = document.createElement('div');
      controlPanel.id = 'slide-capture-panel';
      controlPanel.style.cssText = `
        position: fixed !important;
        top: 80px !important;
        right: 20px !important;
        z-index: 999999 !important;
        background: #fff !important;
        border: 2px solid #333 !important;
        border-radius: 8px !important;
        padding: 15px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.8) !important;
        font-family: Arial, sans-serif !important;
        min-width: 220px !important;
        font-size: 14px !important;
      `;
      
      controlPanel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #333;">
          📹 Enhanced Slide Capture
        </div>
        <div style="margin-bottom: 10px;">
          <button id="start-capture" style="width: 48%; margin-right: 4%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Start</button>
          <button id="stop-capture" style="width: 48%; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;" disabled>Stop</button>
        </div>
        <div style="margin-bottom: 8px;">
          <button id="manual-capture" style="width: 100%; padding: 6px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" disabled>Manual Capture</button>
        </div>
        <div id="status" style="margin-top: 10px; font-size: 12px; color: #666;">Ready</div>
        <div id="slide-count" style="margin-top: 5px; font-size: 12px; color: #666;">Slides: 0</div>
        <div id="ml-status" style="margin-top: 5px; font-size: 10px; color: #999;">ML: ${this.mlModel ? 'Active' : 'Disabled'}</div>
        <div id="debug-info" style="margin-top: 5px; font-size: 9px; color: #888;">Debug: Off</div>
      `;
      
      document.body.appendChild(controlPanel);
      this.bindEvents();
    }
  
    bindEvents() {
      document.getElementById('start-capture').addEventListener('click', () => this.startCapture());
      document.getElementById('stop-capture').addEventListener('click', () => this.stopCapture());
      document.getElementById('manual-capture').addEventListener('click', () => this.manualCapture());
    }
  
    async startCapture() {
      this.isCapturing = true;
      this.slides = [];
      this.lastSlideTime = 0;
      document.getElementById('start-capture').disabled = true;
      document.getElementById('stop-capture').disabled = false;
      document.getElementById('manual-capture').disabled = false;
      document.getElementById('status').textContent = 'Capturing...';
      document.getElementById('debug-info').textContent = 'Debug: Active';
  
      // Capture first slide immediately
      setTimeout(() => this.captureFirstSlide(), 1000);
  
      this.captureInterval = setInterval(() => {
        this.captureAndAnalyze();
      }, this.captureDelay);
    }
  
    async captureFirstSlide() {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        
        const firstScreenshot = canvas.toDataURL('image/png');
        await this.addSlide(firstScreenshot, 'First slide');
        this.lastScreenshot = firstScreenshot;
        console.log('First slide captured automatically');
      }
    }
  
    async manualCapture() {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        
        const screenshot = canvas.toDataURL('image/png');
        await this.addSlide(screenshot, 'Manual capture');
        console.log('Manual slide captured');
      }
    }
  
    stopCapture() {
      this.isCapturing = false;
      clearInterval(this.captureInterval);
      document.getElementById('start-capture').disabled = false;
      document.getElementById('stop-capture').disabled = true;
      document.getElementById('manual-capture').disabled = true;
      document.getElementById('status').textContent = 'Processing...';
      document.getElementById('debug-info').textContent = 'Debug: Off';
      
      this.generateHTML();
    }
  
    async captureAndAnalyze() {
      try {
        const videoElement = document.querySelector('video');
        if (!videoElement) return;
  
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        
        const currentScreenshot = canvas.toDataURL('image/png');
        
        // Store frame for analysis
        this.frameHistory.push({
          screenshot: currentScreenshot,
          timestamp: Date.now()
        });
        
        if (this.frameHistory.length > this.maxFrameHistory) {
          this.frameHistory.shift();
        }
  
        if (this.lastScreenshot) {
          // Enhanced comparison with multiple methods
          const histogramSimilarity = await this.calculateHistogramSimilarity(this.lastScreenshot, currentScreenshot);
          const mlTransition = await this.detectSlideTransition(currentScreenshot, this.lastScreenshot);
          const textChange = await this.analyzeTextChanges(this.lastTextContent, currentScreenshot);
          
          // Combined decision making - more lenient thresholds
          const isTransition = histogramSimilarity < this.similarityThreshold || mlTransition || textChange.isNewSlide;
          
          console.log(`Analysis - Histogram: ${histogramSimilarity.toFixed(3)}, ML: ${mlTransition}, Text: ${textChange.changeType}, Transition: ${isTransition}`);
          
          if (isTransition) {
            this.stabilityCounter = 0;
            document.getElementById('status').textContent = 'Change detected...';
            document.getElementById('debug-info').textContent = `Transition detected - waiting for stability`;
          } else {
            this.stabilityCounter++;
            document.getElementById('debug-info').textContent = `Stability: ${this.stabilityCounter}/${this.requiredStability}`;
            
            // Check if enough time has passed since last slide
            const now = Date.now();
            const timeSinceLastSlide = now - this.lastSlideTime;
            
            if (this.stabilityCounter >= this.requiredStability && timeSinceLastSlide > this.minSlideInterval) {
              await this.processStableSlide(currentScreenshot);
              this.stabilityCounter = 0;
              this.lastSlideTime = now;
            }
          }
        } else {
          this.lastScreenshot = currentScreenshot;
        }
        
      } catch (error) {
        console.error('Capture error:', error);
      }
    }
  
    // Enhanced Image Comparison using Histogram
    async calculateHistogramSimilarity(img1Data, img2Data) {
      return new Promise((resolve) => {
        const canvas1 = document.createElement('canvas');
        const canvas2 = document.createElement('canvas');
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');
        
        const img1 = new Image();
        const img2 = new Image();
        
        let loaded = 0;
        const onLoad = () => {
          loaded++;
          if (loaded === 2) {
            const size = 64; // Reduced for performance
            canvas1.width = canvas2.width = size;
            canvas1.height = canvas2.height = size;
            
            ctx1.drawImage(img1, 0, 0, size, size);
            ctx2.drawImage(img2, 0, 0, size, size);
            
            const data1 = ctx1.getImageData(0, 0, size, size).data;
            const data2 = ctx2.getImageData(0, 0, size, size).data;
            
            const hist1 = this.calculateColorHistogram(data1);
            const hist2 = this.calculateColorHistogram(data2);
            
            const similarity = this.compareHistograms(hist1, hist2);
            resolve(similarity);
          }
        };
        
        img1.onload = img2.onload = onLoad;
        img1.src = img1Data;
        img2.src = img2Data;
      });
    }
  
    calculateColorHistogram(imageData) {
      const hist = {
        r: new Array(64).fill(0), // Reduced bins for performance
        g: new Array(64).fill(0),
        b: new Array(64).fill(0),
        brightness: new Array(64).fill(0)
      };
      
      for (let i = 0; i < imageData.length; i += 4) {
        const r = Math.floor(imageData[i] / 4);
        const g = Math.floor(imageData[i + 1] / 4);
        const b = Math.floor(imageData[i + 2] / 4);
        const brightness = Math.floor((0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]) / 4);
        
        hist.r[r]++;
        hist.g[g]++;
        hist.b[b]++;
        hist.brightness[brightness]++;
      }
      
      return hist;
    }
  
    compareHistograms(hist1, hist2) {
      let similarity = 0;
      const channels = ['r', 'g', 'b', 'brightness'];
      const totalPixels = hist1.r.reduce((sum, val) => sum + val, 0);
      
      channels.forEach(channel => {
        for (let i = 0; i < hist1[channel].length; i++) {
          const freq1 = hist1[channel][i] / totalPixels;
          const freq2 = hist2[channel][i] / totalPixels;
          similarity += Math.min(freq1, freq2);
        }
      });
      
      return similarity / channels.length;
    }
  
    // Machine Learning Integration
    async detectSlideTransition(currentFrame, previousFrame) {
      if (!this.mlModel || !window.tf) return false;
      
      try {
        const tensor1 = await this.imageToTensor(previousFrame);
        const tensor2 = await this.imageToTensor(currentFrame);
        
        const diff = tf.abs(tf.sub(tensor2, tensor1));
        const prediction = this.mlModel.predict(diff.expandDims(0));
        const score = await prediction.data();
        
        // Cleanup
        tensor1.dispose();
        tensor2.dispose();
        diff.dispose();
        prediction.dispose();
        
        return score[0] > 0.5;
        
      } catch (error) {
        console.error('ML detection error:', error);
        return false;
      }
    }
  
    async imageToTensor(imageDataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = canvas.height = 32;
          ctx.drawImage(img, 0, 0, 32, 32);
          
          const tensor = tf.browser.fromPixels(canvas).div(255.0);
          resolve(tensor);
        };
        img.src = imageDataUrl;
      });
    }
  
    // Text Change Detection
    async analyzeTextChanges(oldTextSignature, newImageData) {
      try {
        const newTextSignature = await this.extractTextSignature(newImageData);
        
        if (!oldTextSignature || !newTextSignature) {
          return { isNewSlide: true, changeType: 'new' };
        }
        
        const oldFeatures = JSON.parse(oldTextSignature);
        const newFeatures = JSON.parse(newTextSignature);
        
        // Calculate feature differences
        const textRegionChange = Math.abs(oldFeatures.textRegions - newFeatures.textRegions) / 
                                Math.max(oldFeatures.textRegions, newFeatures.textRegions, 1);
        
        const layoutChange = (
          Math.abs(oldFeatures.horizontalLines - newFeatures.horizontalLines) +
          Math.abs(oldFeatures.verticalLines - newFeatures.verticalLines)
        ) / Math.max(oldFeatures.horizontalLines + oldFeatures.verticalLines, 1);
        
        const brightnessChange = Math.abs(oldFeatures.averageBrightness - newFeatures.averageBrightness) / 255;
        
        // Determine change type
        const totalChange = (textRegionChange + layoutChange + brightnessChange) / 3;
        
        let changeType = 'none';
        let isNewSlide = false;
        
        if (totalChange > this.textChangeThreshold) {
          if (layoutChange > 0.4) { // Reduced from 0.5
            changeType = 'slide_change';
            isNewSlide = true;
          } else if (textRegionChange > 0.25) { // Reduced from 0.3
            changeType = 'content_addition';
            isNewSlide = textRegionChange > 0.5; // Reduced from 0.6
          } else {
            changeType = 'minor_change';
          }
        }
        
        return { isNewSlide, changeType, confidence: totalChange };
        
      } catch (error) {
        console.error('Text analysis error:', error);
        return { isNewSlide: false, changeType: 'error' };
      }
    }
  
    async extractTextSignature(imageDataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const textSignature = this.generateTextSignature(imageData);
          
          resolve(textSignature);
        };
        img.src = imageDataUrl;
      });
    }
  
    generateTextSignature(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      
      let features = {
        horizontalLines: 0,
        verticalLines: 0,
        textRegions: 0,
        averageBrightness: 0,
        edgeDensity: 0
      };
      
      let totalBrightness = 0;
      let edgeCount = 0;
      const sampleStep = 4; // Sample every 4th pixel for performance
      
      for (let y = 1; y < height - 1; y += sampleStep) {
        for (let x = 1; x < width - 1; x += sampleStep) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          totalBrightness += brightness;
          
          // Simple edge detection
          const rightIdx = (y * width + x + 1) * 4;
          const bottomIdx = ((y + 1) * width + x) * 4;
          
          const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
          const bottomBrightness = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
          
          if (Math.abs(brightness - rightBrightness) > 30) {
            features.verticalLines++;
            edgeCount++;
          }
          
          if (Math.abs(brightness - bottomBrightness) > 30) {
            features.horizontalLines++;
            edgeCount++;
          }
        }
      }
      
      const sampledPixels = Math.floor((width * height) / (sampleStep * sampleStep));
      features.averageBrightness = totalBrightness / sampledPixels;
      features.edgeDensity = edgeCount / sampledPixels;
      features.textRegions = Math.floor(edgeCount / 100); // Rough text region estimation
      
      return JSON.stringify(features);
    }
  
    async processStableSlide(screenshotData) {
      try {
        const extractedText = await this.extractTextSignature(screenshotData);
        
        if (this.isNewSlideAdvanced(extractedText, screenshotData)) {
          await this.addSlide(screenshotData, extractedText);
          console.log(`New slide captured: ${this.slides.length}`);
        } else {
          console.log('Slide deemed too similar to previous, skipping');
        }
        
      } catch (error) {
        console.error('Slide processing error:', error);
      }
    }
  
    async addSlide(screenshotData, textSignature) {
      this.slides.push({
        image: screenshotData,
        text: textSignature,
        timestamp: Date.now(),
        slideNumber: this.slides.length + 1
      });
      
      this.lastScreenshot = screenshotData;
      this.lastTextContent = textSignature;
      
      document.getElementById('slide-count').textContent = `Slides: ${this.slides.length}`;
      document.getElementById('status').textContent = `Captured slide ${this.slides.length}`;
    }
  
    isNewSlideAdvanced(extractedText, screenshotData) {
      if (!this.lastTextContent) return true;
      
      try {
        const oldFeatures = JSON.parse(this.lastTextContent);
        const newFeatures = JSON.parse(extractedText);
        
        const structuralChange = Math.abs(oldFeatures.horizontalLines - newFeatures.horizontalLines) +
                                Math.abs(oldFeatures.verticalLines - newFeatures.verticalLines);
        
        const contentChange = Math.abs(oldFeatures.textRegions - newFeatures.textRegions);
        
        // More lenient thresholds
        return structuralChange > 30 || contentChange > 5; // Reduced from 50 and 10
      } catch (error) {
        return true;
      }
    }
  
    async generateHTML() {
      if (this.slides.length === 0) {
        alert('No slides captured!');
        document.getElementById('status').textContent = 'No slides to save';
        return;
      }
  
      const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
      <title>Enhanced Lecture Slides</title>
      <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .slide { page-break-after: always; margin-bottom: 40px; text-align: center; }
          .slide:last-child { page-break-after: avoid; }
          .slide img { max-width: 100%; height: auto; border: 1px solid #ccc; }
          .slide-number { margin-top: 10px; font-size: 14px; color: #666; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          @media print { .slide { page-break-after: always; } }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>Enhanced YouTube Lecture Slides</h1>
          <p>Captured: ${new Date().toLocaleDateString()} | Slides: ${this.slides.length}</p>
          <p><small>Enhanced with ML detection and text analysis</small></p>
      </div>
      ${this.slides.map((slide, index) => `
      <div class="slide">
          <img src="${slide.image}" alt="Slide ${index + 1}">
          <div class="slide-number">Slide ${index + 1}</div>
      </div>`).join('')}
  </body>
  </html>`;
  
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `enhanced-lecture-slides-${timestamp}.html`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      document.getElementById('status').textContent = `Saved ${this.slides.length} slides`;
      console.log(`HTML file generated with ${this.slides.length} slides`);
    }
  }
  
  // Initialize extension
  function initializeExtension() {
    if (window.location.hostname.includes('youtube.com') && window.location.pathname === '/watch') {
      const waitForVideo = () => {
        const video = document.querySelector('video');
        if (video) {
          window.slideCapture = new SlideCapture();
        } else {
          setTimeout(waitForVideo, 1000);
        }
      };
      waitForVideo();
    }
  }
  
  initializeExtension();
  
  // Handle YouTube navigation
  let currentUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      setTimeout(initializeExtension, 2000);
    }
  }).observe(document, { subtree: true, childList: true });