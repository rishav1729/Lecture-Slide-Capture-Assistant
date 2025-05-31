class SlideCapture {
    constructor() {
      this.isCapturing = false;
      this.captureInterval = null;
      this.slides = [];
      this.lastScreenshot = null;
      this.lastImageData = null;
      this.stabilityCounter = 0;
      this.requiredStability = 3;
      this.captureDelay = 2000;
      this.similarityThreshold = 0.92;
      this.folderPath = '';
      
      console.log('YouTube Slide Capture: Initializing without external libraries');
      this.initializeUI();
    }
  
    initializeUI() {
      console.log('YouTube Slide Capture: Creating UI panel...');
      
      // Remove existing panel if it exists
      const existingPanel = document.getElementById('slide-capture-panel');
      if (existingPanel) {
        existingPanel.remove();
      }
      
      // Create floating control panel
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
        max-width: 300px !important;
        font-size: 14px !important;
      `;
      
      controlPanel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #333;">
          📹 Slide Capture
        </div>
        <div style="margin-bottom: 10px;">
          <button id="folder-button" style="width: 100%; padding: 8px; border: 1px solid #ccc; background: #f9f9f9; cursor: pointer; border-radius: 4px;">
            📁 Select Save Folder
          </button>
          <input type="file" id="folder-select" webkitdirectory style="display: none;">
        </div>
        <div style="margin-bottom: 10px;">
          <button id="start-capture" style="width: 48%; margin-right: 4%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Start</button>
          <button id="stop-capture" style="width: 48%; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;" disabled>Stop</button>
        </div>
        <div id="status" style="margin-top: 10px; font-size: 12px; color: #666;">Ready - Select folder first</div>
        <div id="slide-count" style="margin-top: 5px; font-size: 12px; color: #666;">Slides captured: 0</div>
      `;
      
      document.body.appendChild(controlPanel);
      console.log('YouTube Slide Capture: UI panel created successfully');
      
      this.bindEvents();
    }
  
    bindEvents() {
      console.log('YouTube Slide Capture: Binding events...');
      
      // Folder selection
      document.getElementById('folder-button').addEventListener('click', () => {
        document.getElementById('folder-select').click();
      });
      
      document.getElementById('folder-select').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.folderPath = e.target.files[0].webkitRelativePath.split('/')[0];
          document.getElementById('status').textContent = `Ready - Folder: ${this.folderPath}`;
          document.getElementById('start-capture').style.background = '#4CAF50';
          console.log('Folder selected:', this.folderPath);
        }
      });
  
      document.getElementById('start-capture').addEventListener('click', () => {
        this.startCapture();
      });
  
      document.getElementById('stop-capture').addEventListener('click', () => {
        this.stopCapture();
      });
      
      console.log('YouTube Slide Capture: Events bound successfully');
    }
  
    async startCapture() {
      if (!this.folderPath) {
        alert('Please select a folder first!');
        return;
      }
  
      this.isCapturing = true;
      this.slides = [];
      document.getElementById('start-capture').disabled = true;
      document.getElementById('stop-capture').disabled = false;
      document.getElementById('status').textContent = 'Capturing...';
  
      // Start periodic capture
      this.captureInterval = setInterval(() => {
        this.captureAndAnalyze();
      }, this.captureDelay);
    }
  
    stopCapture() {
      this.isCapturing = false;
      clearInterval(this.captureInterval);
      document.getElementById('start-capture').disabled = false;
      document.getElementById('stop-capture').disabled = true;
      document.getElementById('status').textContent = 'Processing...';
      
      this.generatePDF();
    }
  
    async captureAndAnalyze() {
      try {
        const videoElement = document.querySelector('video');
        if (!videoElement) return;
  
        // Capture screenshot
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        
        const currentScreenshot = canvas.toDataURL('image/png');
        
        // Compare with last screenshot
        if (this.lastScreenshot) {
          const similarity = await this.calculateImageSimilarity(this.lastScreenshot, currentScreenshot);
          
          if (similarity < this.similarityThreshold) {
            // Significant change detected
            this.stabilityCounter = 0;
            this.lastScreenshot = currentScreenshot;
            document.getElementById('status').textContent = 'Change detected...';
          } else {
            // Similar image - check stability
            this.stabilityCounter++;
            
            if (this.stabilityCounter >= this.requiredStability) {
              // Stable slide detected
              await this.processStableSlide(currentScreenshot);
              this.stabilityCounter = 0;
            }
          }
        } else {
          this.lastScreenshot = currentScreenshot;
        }
        
      } catch (error) {
        console.error('Capture error:', error);
      }
    }
  
    async calculateImageSimilarity(img1Data, img2Data) {
      // Enhanced pixel-based comparison without external libraries
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
            // Use smaller size for faster comparison
            const compareWidth = 160;
            const compareHeight = 90;
            
            canvas1.width = canvas2.width = compareWidth;
            canvas1.height = canvas2.height = compareHeight;
            
            ctx1.drawImage(img1, 0, 0, compareWidth, compareHeight);
            ctx2.drawImage(img2, 0, 0, compareWidth, compareHeight);
            
            const data1 = ctx1.getImageData(0, 0, compareWidth, compareHeight).data;
            const data2 = ctx2.getImageData(0, 0, compareWidth, compareHeight).data;
            
            // Calculate histogram-based similarity
            const hist1 = this.calculateHistogram(data1);
            const hist2 = this.calculateHistogram(data2);
            const similarity = this.compareHistograms(hist1, hist2);
            
            resolve(similarity);
          }
        };
        
        img1.onload = img2.onload = onLoad;
        img1.src = img1Data;
        img2.src = img2Data;
      });
    }
  
    calculateHistogram(imageData) {
      const hist = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0) };
      
      for (let i = 0; i < imageData.length; i += 4) {
        hist.r[imageData[i]]++;
        hist.g[imageData[i + 1]]++;
        hist.b[imageData[i + 2]]++;
      }
      
      return hist;
    }
  
    compareHistograms(hist1, hist2) {
      let correlation = 0;
      const totalPixels = hist1.r.reduce((sum, val) => sum + val, 0);
      
      ['r', 'g', 'b'].forEach(channel => {
        for (let i = 0; i < 256; i++) {
          const freq1 = hist1[channel][i] / totalPixels;
          const freq2 = hist2[channel][i] / totalPixels;
          correlation += Math.min(freq1, freq2);
        }
      });
      
      return correlation / 3; // Average across RGB channels
    }
  
    async processStableSlide(screenshotData) {
      try {
        // Simple change detection without OCR
        if (this.isNewSlide(screenshotData)) {
          this.slides.push({
            image: screenshotData,
            timestamp: Date.now(),
            slideNumber: this.slides.length + 1
          });
          
          this.lastScreenshot = screenshotData;
          
          document.getElementById('slide-count').textContent = `Slides captured: ${this.slides.length}`;
          document.getElementById('status').textContent = `Captured slide ${this.slides.length}`;
          
          console.log(`New slide captured: ${this.slides.length}`);
        }
        
      } catch (error) {
        console.error('Slide processing error:', error);
      }
    }
  
    isNewSlide(currentScreenshot) {
      if (!this.lastScreenshot) return true;
      
      // For now, rely purely on the image similarity check
      // This is called only after stability check, so it should be a new slide
      return true;
    }
  
    async generatePDF() {
      if (this.slides.length === 0) {
        alert('No slides captured!');
        document.getElementById('status').textContent = 'No slides to save';
        return;
      }
  
      try {
        // Create a simple HTML document with all slides
        const htmlContent = this.generateHTMLDocument();
        
        // Create and download as HTML file (which can be printed to PDF)
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `lecture-slides-${timestamp}.html`;
        
        // Download the HTML file
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        document.getElementById('status').textContent = `Saved ${this.slides.length} slides as ${filename}`;
        
        // Show instructions for PDF conversion
        setTimeout(() => {
          alert(`HTML file downloaded! To convert to PDF:\n1. Open the downloaded HTML file in Chrome\n2. Press Ctrl+P (or Cmd+P on Mac)\n3. Select "Save as PDF"\n4. Save your PDF`);
        }, 1000);
        
      } catch (error) {
        console.error('HTML generation error:', error);
        document.getElementById('status').textContent = 'Error generating file';
      }
    }
  
    generateHTMLDocument() {
      let html = `
  <!DOCTYPE html>
  <html>
  <head>
      <title>Lecture Slides</title>
      <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .slide { 
              page-break-after: always; 
              margin-bottom: 40px; 
              text-align: center;
          }
          .slide:last-child { page-break-after: avoid; }
          .slide img { 
              max-width: 100%; 
              height: auto; 
              border: 1px solid #ccc;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .slide-number { 
              margin-top: 10px; 
              font-size: 14px; 
              color: #666; 
          }
          .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
          }
          @media print {
              .slide { page-break-after: always; }
              .slide:last-child { page-break-after: avoid; }
          }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>YouTube Lecture Slides</h1>
          <p>Captured on ${new Date().toLocaleDateString()} | Total Slides: ${this.slides.length}</p>
      </div>
  `;
  
      this.slides.forEach((slide, index) => {
        html += `
      <div class="slide">
          <img src="${slide.image}" alt="Slide ${index + 1}">
          <div class="slide-number">Slide ${index + 1}</div>
      </div>
  `;
      });
  
      html += `
  </body>
  </html>`;
  
      return html;
    }
  }
  
  // Initialize when page loads
  function initializeExtension() {
    console.log('YouTube Slide Capture: Initializing...');
    
    if (window.location.hostname.includes('youtube.com') && window.location.pathname === '/watch') {
      console.log('YouTube Slide Capture: On YouTube watch page');
      
      // Wait for video element to load
      const waitForVideo = () => {
        const video = document.querySelector('video');
        if (video) {
          console.log('YouTube Slide Capture: Video element found');
          window.slideCapture = new SlideCapture();
        } else {
          console.log('YouTube Slide Capture: Waiting for video element...');
          setTimeout(waitForVideo, 1000);
        }
      };
      
      waitForVideo();
    } else {
      console.log('YouTube Slide Capture: Not on YouTube watch page');
    }
  }
  
  // Initialize immediately and on navigation changes
  initializeExtension();
  
  // Handle YouTube's navigation (since it's a SPA)
  let currentUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      console.log('YouTube Slide Capture: URL changed, reinitializing...');
      setTimeout(initializeExtension, 2000); // Wait for page to load
    }
  }).observe(document, { subtree: true, childList: true });