chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Slide Capture extension installed');
  });
  
  // Handle messages from content script if needed
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'saveSlides') {
      // Handle slide saving logic if needed
      sendResponse({success: true});
    }
  });