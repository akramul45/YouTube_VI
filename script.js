// IIFE to encapsulate the script and avoid polluting the global scope
(function() {
  'use strict';

  // --- 1. DOM Element Selection ---
  const videoLinkInput = document.getElementById('videoLink');
  const postBtn = document.getElementById('post');
  const generateBtn = document.getElementById('generate');
  const loadingDiv = document.getElementById('Loading');
  const messageDiv = document.getElementById('massege');
  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  const mainNav = document.getElementById('main-nav');
  const thumbnailImg = document.getElementById('getThumbnail');
  const downloadThumbnailBtn = document.getElementById('downloadThumbnail');
  const uploadDateTimeDiv = document.getElementById('getUploadDateTime');
  const viewCountSpan = document.getElementById('getViewNumber');
  const likeCountSpan = document.getElementById('getLikeNumber');
  const commentCountSpan = document.getElementById('getCommentNumber');
  const titleContentDiv = document.getElementById('getTitleContent');
  const copyTitleBtn = document.getElementById('copyTitle');
  const audienceP = document.getElementById('getAudience');
  const categoryP = document.getElementById('getCategory');
  const licenseP = document.getElementById('getLicense');
  const tagContentDiv = document.getElementById('getTagContent');
  const copySelectedTagsBtn = document.getElementById('copySelected');
  const copyAllTagsBtn = document.getElementById('copyAllTags');
  const highlightCountDiv = document.getElementById('highlightCount');
  const highlightTableDiv = document.getElementById('highLightTable');
  const descriptionContentDiv = document.getElementById('getDescriptionContent');
  const copyAllDescriptionBtn = document.getElementById('copyAllDescription');
  const channelLogoImg = document.getElementById('getChannelLogo');
  const channelNameDiv = document.getElementById('getChannelName');
  const channelHandleDiv = document.getElementById('getChannelHandle');
  const channelSubsDiv = document.getElementById('getChannelSubscribeNumber');
  const channelStartDateDiv = document.getElementById('getChannelStartDate');
  const channelCountryDiv = document.getElementById('getChannelStartCountryName');
  const totalVideoDiv = document.getElementById('getTotalVideo');
  const longVideo90DaysDiv = document.getElementById('getLast90DaysLongVideo');
  const shortsVideo90DaysDiv = document.getElementById('getLast90DaysShortsVideo');
  const channelViewCountDiv = document.getElementById('getChannelViewNumber');
  const channelTagContentDiv = document.getElementById('getChannelTagContent');
  const copySelectedChannelTagsBtn = document.getElementById('copySelectedChannelTags');
  const copyAllChannelTagsBtn = document.getElementById('copyAllChannelTags');
  const timeTableDiv = document.getElementById('7daysVideoTimeTable');
  const videoListDiv = document.getElementById('7daysVideolist');

  // --- 2. API Configuration & State ---
  const API_KEY = 'AIzaSyDTx7Fi1zABmPLDCt6C7bz1c_wVPffuwnY'; // YouTube Data API v3 Key
  const API_BASE_URL = 'https://www.googleapis.com/youtube/v3/';
  let currentVideoTags = [];
  let currentChannelTags = [];
  let recentVideosData = [];

  // --- 3. Event Listeners ---
  menuToggle.addEventListener('click', () => mainNav.classList.add('menu-open'));
  menuClose.addEventListener('click', () => mainNav.classList.remove('menu-open'));
  postBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      videoLinkInput.value = text;
      showMessage('লিঙ্ক সফলভাবে পেস্ট হয়েছে!', 'success');
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      showMessage('ক্লিপবোর্ড থেকে লিঙ্ক পড়তে ব্যর্থ হয়েছে।', 'error');
    }
  });
  generateBtn.addEventListener('click', handleGenerate);
  copyTitleBtn.addEventListener('click', () => copyToClipboard(titleContentDiv.innerText, copyTitleBtn));
  copyAllDescriptionBtn.addEventListener('click', () => copyToClipboard(descriptionContentDiv.innerText, copyAllDescriptionBtn));
  copyAllTagsBtn.addEventListener('click', () => { if (currentVideoTags && currentVideoTags.length > 0) copyToClipboard(currentVideoTags.join(', '), copyAllTagsBtn); });
  copySelectedTagsBtn.addEventListener('click', () => handleCopySelectedTags(tagContentDiv, copySelectedTagsBtn));
  copyAllChannelTagsBtn.addEventListener('click', () => { if (currentChannelTags && currentChannelTags.length > 0) copyToClipboard(currentChannelTags.join(', '), copyAllChannelTagsBtn); });
  copySelectedChannelTagsBtn.addEventListener('click', () => handleCopySelectedTags(channelTagContentDiv, copySelectedChannelTagsBtn));
  downloadThumbnailBtn.addEventListener('click', () => downloadImage(thumbnailImg.src, 'thumbnail.jpg'));

  // --- Main Generate Function ---
  async function handleGenerate() {
    const url = videoLinkInput.value.trim();
    if (!url) return showMessage('অনুগ্রহ করে একটি ইউটিউব ভিডিও লিঙ্ক দিন।', 'error');
    const videoId = extractVideoId(url);
    if (!videoId) return showMessage('সঠিক ইউটিউব ভিডিও লিঙ্ক খুঁজে পাওয়া যায়নি।', 'error');

    setLoadingState(true);
    messageDiv.style.display = 'none';
    loadingDiv.textContent = 'তথ্য আনা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...';
    hideContentSections();

    try {
      const videoDetails = await fetchVideoDetails(videoId);
      if (!videoDetails || videoDetails.items.length === 0) throw new Error("ভিডিও খুঁজে পাওয়া যায়নি বা API ত্রুটি।");
      const videoData = videoDetails.items[0];
      const channelId = videoData.snippet.channelId;

      const [channelData, recentVideos, ninetyDayStats] = await Promise.all([
        fetchChannelDetails(channelId),
        fetchRecentChannelVideos(channelId, 15),
        fetchAndCategorizeVideos(channelId, 90)
      ]);

      recentVideosData = recentVideos.items;
      updateUI(videoData, channelData.items[0], ninetyDayStats);
      populateVideoList(recentVideosData, videoId);
      populateTimeTable(recentVideosData);

      revealContentSections();
      videoLinkInput.value = '';
      showMessage('তথ্য সফলভাবে লোড হয়েছে!', 'success');

    } catch (error) {
      console.error('Data fetching error:', error);
      showMessage(`ডেটা আনতে সমস্যা হয়েছে: ${error.message || 'একটি অজানা ত্রুটি ঘটেছে।'}`, 'error');
      resetUI();
    } finally {
      setLoadingState(false);
      loadingDiv.textContent = '';
    }
  }

  // --- 4. API Fetching Functions ---
  async function fetchVideoDetails(videoId) { const url = `${API_BASE_URL}videos?part=snippet,statistics,contentDetails,status&id=${videoId}&key=${API_KEY}`; const response = await fetch(url); if (!response.ok) throw new Error('ভিডিওর বিবরণ আনা যায়নি।'); return response.json(); }
  async function fetchChannelDetails(channelId) { const url = `${API_BASE_URL}channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${API_KEY}`; const response = await fetch(url); if (!response.ok) throw new Error('চ্যানেলের বিবরণ আনা যায়নি।'); return response.json(); }
  async function fetchRecentChannelVideos(channelId, days) { const date = new Date(); date.setDate(date.getDate() - days); const publishedAfter = date.toISOString(); const url = `${API_BASE_URL}search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=50&publishedAfter=${publishedAfter}&key=${API_KEY}`; const response = await fetch(url); if (!response.ok) throw new Error('সাম্প্রতিক ভিডিও আনা যায়নি।'); return response.json(); }
  async function fetchAndCategorizeVideos(channelId, days) {
    let longCount = 0, shortCount = 0;
    try {
      const searchResult = await fetchRecentChannelVideos(channelId, days);
      if (!searchResult.items || searchResult.items.length === 0) return { longCount, shortCount };
      const videoIds = searchResult.items.map(item => item.id.videoId).join(',');
      const videosUrl = `${API_BASE_URL}videos?part=contentDetails&id=${videoIds}&key=${API_KEY}`;
      const videosResponse = await fetch(videosUrl);
      if (!videosResponse.ok) return { longCount, shortCount };
      const videosDetails = await videosResponse.json();
      videosDetails.items.forEach(video => parseISO8601Duration(video.contentDetails.duration) > 60 ? longCount++ : shortCount++);
      return { longCount, shortCount };
    } catch (error) { console.error('Error categorizing videos:', error); return { longCount: 'N/A', shortCount: 'N/A' }; }
  }

  // --- 5. UI Update Functions ---
  function updateUI(video, channel, ninetyDayStats) {
    const stats = video.statistics || {}, snippet = video.snippet || {};
    thumbnailImg.src = snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || 'https://via.placeholder.com/640x360?text=No+Thumbnail';
    uploadDateTimeDiv.textContent = `আপলোড: ${formatDate(snippet.publishedAt)}`;
    viewCountSpan.innerHTML = `👁️ ${formatNumber(stats.viewCount)}`;
    likeCountSpan.innerHTML = `👍 ${formatNumber(stats.likeCount)}`;
    commentCountSpan.innerHTML = `💬 ${formatNumber(stats.commentCount)}`;
    titleContentDiv.textContent = snippet.title;
    audienceP.innerHTML = `<strong>Audience:</strong> ${video.status?.madeForKids ? 'বাচ্চাদের জন্য' : 'বাচ্চাদের জন্য নয়'}`;
    licenseP.innerHTML = `<strong>Lisence:</strong> ${video.status?.license === 'youtube' ? 'স্ট্যান্ডার্ড ইউটিউব লাইসেন্স' : 'ক্রিয়েটিভ কমন্স'}`;
    categoryP.innerHTML = `<strong>Catagory :</strong> ${getCategoryName(snippet.categoryId)}`;
    updateVideoTags(snippet.tags);
    updateDescription(snippet.description);

    const channelStats = channel.statistics || {}, channelSnippet = channel.snippet || {};
    channelLogoImg.src = channelSnippet.thumbnails?.high?.url || 'https://via.placeholder.com/100?text=Logo';
    channelNameDiv.innerHTML = `<strong> </strong> ${channelSnippet.title}`;
    channelHandleDiv.innerHTML = `<strong>@</strong>${channelSnippet.customUrl?.substring(1) || 'N/A'}`;
    channelSubsDiv.innerHTML = `<strong>সাবস্ক্রাইব:</strong> ${channelStats.hiddenSubscriberCount ? 'Hidden' : formatNumber(channelStats.subscriberCount)}`;
    channelStartDateDiv.innerHTML = `<strong>🎥 :</strong> ${formatDate(channelSnippet.publishedAt, { year: 'numeric', month: 'long', day: 'numeric' })}`;
    channelCountryDiv.innerHTML = `<strong> </strong> ${getCountryFlagAndName(channelSnippet.country)}`;
    totalVideoDiv.innerHTML = `<strong>T.V. :</strong> ${formatNumber(channelStats.videoCount)}`;
    channelViewCountDiv.innerHTML = `<strong>Channel View :</strong> ${formatNumber(channelStats.viewCount)}`;
    longVideo90DaysDiv.innerHTML = `<strong>লং :</strong> ${ninetyDayStats.longCount}`;
    shortsVideo90DaysDiv.innerHTML = `<strong>শর্টস :</strong> ${ninetyDayStats.shortCount}`;
    updateChannelTags(channel.brandingSettings?.channel?.keywords);
  }

  function createTagSpans(tagsArray, containerElement) {
    containerElement.innerHTML = '';
    if (!tagsArray || tagsArray.length === 0) return containerElement.textContent = 'কোনো ট্যাগ পাওয়া যায়নি।';
    tagsArray.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.textContent = tag;
      tagEl.className = 'tag-span'; // simple class for styling
      tagEl.style.cssText = 'cursor: pointer; padding: 5px 10px; background-color: #333; border-radius: 5px; display: inline-block; margin: 3px; transition: all 0.2s;';
      tagEl.addEventListener('click', () => {
        tagEl.classList.toggle('selected');
        tagEl.style.backgroundColor = tagEl.classList.contains('selected') ? 'var(--primary-color)' : '#333';
        tagEl.style.color = tagEl.classList.contains('selected') ? '#000' : 'var(--text-color)';
      });
      containerElement.appendChild(tagEl);
    });
  }
  function updateVideoTags(tags) { currentVideoTags = tags || []; createTagSpans(currentVideoTags, tagContentDiv); }
  function updateChannelTags(keywords) {
    currentChannelTags = keywords ? (keywords.match(/"[^"]+"|[\w']+/g) || []).map(tag => tag.replace(/"/g, '')) : [];
    createTagSpans(currentChannelTags, channelTagContentDiv);
  }

  // --- START: NEW AND IMPROVED DESCRIPTION HIGHLIGHTING LOGIC ---
  const copyrightKeywords = [
     
  { term: '©', type: 'Symbol', reason: 'Standard copyright symbol.' },
  { term: '®', type: 'Symbol', reason: 'Registered trademark symbol.' },
  { term: '™', type: 'Symbol', reason: 'Trademark symbol.' },
  { term: '℗', type: 'Symbol', reason: 'Sound recording copyright symbol.' },
  { term: 'সর্বস্বত্ব সংরক্ষিত', type: 'Declaration', reason: 'বাংলা রূপে কপিরাইট ঘোষণা।' },
  { term: 'আইন', type: 'Legal Reference', reason: 'Section 107 বা আইন দ্বারা সুরক্ষিত।' },
  { term: 'লাইসেন্স', type: 'License', reason: 'বাংলা রূপে লাইসেন্স।' },
  { term: 'পাবলিক ডোমেইন', type: 'Status', reason: 'বাংলা রূপে Public Domain।' },
  { term: 'কপিরাইট', type: 'Notice', reason: 'Copyrighted material।' },
  { term: 'ন্যায্য ব্যবহার', type: 'Legal Doctrine', reason: 'Fair Use ধারণা।' },
  { term: 'শিক্ষামূলক উদ্দেশ্যে', type: 'Usage Context', reason: 'Educational purposes।' },
  { term: 'অনুমতি', type: 'Restriction', reason: 'Permission required।' },
  { term: 'পুনঃআপলোড', type: 'Restriction', reason: 'Reupload prohibited।' },
  { term: 'স্ট্রাইক', type: 'Restriction', reason: 'Reupload = Strike।' },
  { term: 'CC BY', type: 'License', reason: 'Creative Commons Attribution license।' },
  { term: 'সুরক্ষিত', type: 'Protection', reason: 'Protected।' },
  { term: 'লঙ্ঘন', type: 'Violation', reason: 'Violation।' },
  { term: 'All Rights', type: 'Declaration', reason: 'All rights reserved।' },
  { term: 'Reserved', type: 'Declaration', reason: 'Reserved rights।' },
  { term: 'All Rights Reserved', type: 'Declaration', reason: 'Full copyright reserved।' },
  { term: 'Section 107', type: 'Legal Reference', reason: 'Fair Use reference in US law।' },
  { term: 'License', type: 'License', reason: 'Official license।' },
  { term: 'Public Domain', type: 'Status', reason: 'Work not protected by copyright।' },
  { term: 'Copyright', type: 'Notice', reason: 'Copyrighted material।' },
  { term: 'Fair Use', type: 'Legal Doctrine', reason: 'Allows limited use of copyrighted material।' },
  { term: 'Educational purposes', type: 'Usage Context', reason: 'Educational justification।' },
  { term: 'Permission', type: 'Restriction', reason: 'Requires permission।' },
  { term: 'Reupload', type: 'Restriction', reason: 'Unauthorized re-upload prohibited।' },
  { term: 'Reupload = Strike', type: 'Restriction', reason: 'Reupload leads to strike।' },
  { term: 'Protected', type: 'Protection', reason: 'Protected content।' },
  { term: 'Violation', type: 'Violation', reason: 'Copyright violation।' }

  ];

  function escapeHtml(text) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return text.replace(/[&<>"']/g, m => map[m]);
  }
  
  function updateDescription(description) {
      const rawDescription = description || 'কোনো বর্ণনা পাওয়া যায়নি।';
      
      let allMatches = [];
      copyrightKeywords.forEach(keywordObj => {
          const escapedTerm = keywordObj.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedTerm, 'gi');
          let match;
          while ((match = regex.exec(rawDescription)) !== null) {
              allMatches.push({
                  startIndex: match.index,
                  endIndex: match.index + match[0].length,
                  matchedText: match[0],
                  keyword: keywordObj
              });
          }
      });

      if (allMatches.length === 0) {
          descriptionContentDiv.innerHTML = `<pre>${escapeHtml(rawDescription)}</pre>`;
          highlightCountDiv.textContent = `কপিরাইট সম্পর্কিত শব্দ: 0`;
          highlightTableDiv.innerHTML = '';
          return;
      }

      allMatches.sort((a, b) => a.startIndex - b.startIndex || (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex));

      const filteredMatches = [];
      let lastIndex = -1;
      allMatches.forEach(match => {
          if (match.startIndex >= lastIndex) {
              filteredMatches.push(match);
              lastIndex = match.endIndex;
          }
      });

      let resultHTML = '';
      let currentIndex = 0;
      const uniqueKeywordsForTable = new Map();
      let matchIndex = 0;

      filteredMatches.forEach(match => {
          const uniqueId = `highlight-match-${matchIndex++}`;
          resultHTML += escapeHtml(rawDescription.substring(currentIndex, match.startIndex));
          resultHTML += `<span class="highlighted" id="${uniqueId}">${escapeHtml(match.matchedText)}</span>`;
          currentIndex = match.endIndex;

          const termKey = match.keyword.term.toLowerCase();
          if (!uniqueKeywordsForTable.has(termKey)) {
              uniqueKeywordsForTable.set(termKey, {
                  ...match.keyword,
                  matchedText: match.matchedText,
                  elementId: uniqueId
              });
          }
      });
      resultHTML += escapeHtml(rawDescription.substring(currentIndex));

      const uniqueKeywordsArray = Array.from(uniqueKeywordsForTable.values());
      highlightCountDiv.textContent = `কপিরাইট সম্পর্কিত শব্দ: ${uniqueKeywordsArray.length}`;
      descriptionContentDiv.innerHTML = `<pre>${resultHTML}</pre>`;
      generateHighlightTable(uniqueKeywordsArray);
  }

  function generateHighlightTable(foundKeywords) {
    if (foundKeywords.length === 0) {
      highlightTableDiv.innerHTML = '';
      return;
    }
    let tableHTML = `<table><thead><tr><th>হাইলাইট শব্দ</th><th>Copyright ধরন</th><th>কারণ</th></tr></thead><tbody>`;
    foundKeywords.forEach(item => { tableHTML += `<tr><td class="clickable-keyword" data-target-id="${item.elementId}">${item.matchedText}</td><td>${item.type}</td><td>${item.reason}</td></tr>`; });
    tableHTML += `</tbody></table>`;
    highlightTableDiv.innerHTML = tableHTML;
    highlightTableDiv.querySelectorAll('.clickable-keyword').forEach(el => {
      el.addEventListener('click', () => {
        const targetId = el.getAttribute('data-target-id');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetElement.style.transition = 'background-color 0.2s ease-in-out';
          targetElement.style.backgroundColor = 'var(--primary-color)';
          setTimeout(() => { targetElement.style.backgroundColor = 'yellow'; }, 500);
        }
      });
    });
  }
  // --- END: NEW AND IMPROVED DESCRIPTION HIGHLIGHTING LOGIC ---
  
  function populateVideoList(videos, currentVideoId) { /* ... This function remains the same ... */ 
      videoListDiv.innerHTML = '';
      if (!videos || videos.length === 0) { videoListDiv.textContent = 'গত ১৫ দিনে কোনো ভিডিও আপলোড করা হয়নি।'; return; }
      const listContainer = document.createElement('div');
      listContainer.style.cssText = 'display: grid; gap: 10px;';
      videos.forEach(video => {
          const videoId = video.id.videoId;
          const videoItem = document.createElement('div');
          videoItem.className = 'video-item';
          videoItem.dataset.videoId = videoId;
          videoItem.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background-color: #222; border-radius: 8px; transition: all 0.3s; border: 2px solid transparent;';
          if (videoId === currentVideoId) videoItem.classList.add('highlight-video');
          const thumbnailLink = document.createElement('a');
          thumbnailLink.href = `https://www.youtube.com/watch?v=${videoId}`;
          thumbnailLink.target = '_blank';
          thumbnailLink.innerHTML = `<img src="${video.snippet.thumbnails.default.url}" style="width: 120px; border-radius: 5px; display:block;">`;
          const infoDiv = document.createElement('div');
          const titleDiv = document.createElement('div');
          titleDiv.textContent = video.snippet.title;
          titleDiv.style.cssText = 'font-weight: bold; cursor: pointer;';
          titleDiv.addEventListener('click', () => { videoLinkInput.value = `https://www.youtube.com/watch?v=${videoId}`; handleGenerate(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
          const dateDiv = document.createElement('div');
          dateDiv.textContent = formatDate(video.snippet.publishedAt);
          dateDiv.style.cssText = 'font-size: 0.8em; color: #aaa;';
          infoDiv.append(titleDiv, dateDiv);
          videoItem.append(thumbnailLink, infoDiv);
          listContainer.appendChild(videoItem);
      });
      videoListDiv.appendChild(listContainer);
  }
  
  function populateTimeTable(videos) { /* ... This function remains the same ... */ 
    timeTableDiv.innerHTML = '';
    if (!videos || videos.length === 0) return;
    const days = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
    const timeSlots = ['১২-২am', '২-৪am', '৪-৬am', '৬-৮am', '৮-১০am', '১০-১২pm', '১২-২pm', '২-৪pm', '৪-৬pm', '৬-৮pm', '৮-১০pm', '১০-১২am'];
    const timeGrid = Array(12).fill(0).map(() => Array(7).fill(0));
    videos.forEach(video => { const pubDate = new Date(video.snippet.publishedAt); const day = pubDate.getDay(); const hour = pubDate.getHours(); timeGrid[Math.floor(hour / 2)][day]++; });
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; text-align: center;';
    let tableHTML = '<thead><tr><th>Time</th>' + days.map(day => `<th>${day}</th>`).join('') + '</tr></thead><tbody>';
    timeSlots.forEach((slot, i) => {
        tableHTML += `<tr><td style="border: 1px solid var(--border-color); padding: 8px; font-size: 0.8em;">${slot}</td>`;
        days.forEach((_, j) => {
            const count = timeGrid[i][j];
            const opacity = count > 0 ? Math.min(0.2 + count * 0.2, 1) : 0;
            tableHTML += `<td data-day="${j}" data-timeslot="${i}" style="border: 1px solid var(--border-color); padding: 8px; background-color: rgba(0, 230, 118, ${opacity}); font-weight: bold; transition: background-color 0.2s; cursor: ${count > 0 ? 'pointer' : 'default'};">${count > 0 ? count : ''}</td>`;
        });
        tableHTML += '</tr>';
    });
    table.innerHTML = tableHTML + '</tbody>';
    timeTableDiv.appendChild(table);
    table.addEventListener('click', (event) => { const cell = event.target.closest('td[data-day]'); if (cell) highlightVideosByTime(parseInt(cell.dataset.day), parseInt(cell.dataset.timeslot)); });
  }

  function highlightVideosByTime(day, timeSlot) { /* ... This function remains the same ... */ 
      document.querySelectorAll('.video-item.highlight-video').forEach(el => el.classList.remove('highlight-video'));
      const videosToHighlight = recentVideosData.filter(video => { const pubDate = new Date(video.snippet.publishedAt); return pubDate.getDay() === day && Math.floor(pubDate.getHours() / 2) === timeSlot; });
      if (videosToHighlight.length > 0) {
          videosToHighlight.forEach(video => {
              const videoElement = videoListDiv.querySelector(`[data-video-id="${video.id.videoId}"]`);
              if (videoElement) { videoElement.classList.add('highlight-video'); videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          });
      }
  }

  // --- 6. Utility and Helper Functions ---
  function hideContentSections() { document.querySelectorAll('.content-section').forEach(section => { section.classList.add('hidden'); section.classList.remove('fade-in'); }); }
  function revealContentSections() { const sections = document.querySelectorAll('.content-section'); sections.forEach((section, index) => setTimeout(() => { section.classList.remove('hidden'); section.classList.add('fade-in'); }, index * 100)); }
  function extractVideoId(url) { const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/); return match ? match[1] : null; }
  function setLoadingState(isLoading) { generateBtn.disabled = isLoading; generateBtn.textContent = isLoading ? '...' : 'Generate'; document.body.style.cursor = isLoading ? 'wait' : 'default'; }
  function showMessage(message, type = 'error', duration = 5000) { messageDiv.textContent = message; messageDiv.className = type === 'error' ? 'msg-error' : 'msg-success'; messageDiv.style.display = 'block'; setTimeout(() => { messageDiv.style.display = 'none'; }, duration); }
  function resetUI() { thumbnailImg.src = 'https://via.placeholder.com/640x360?text=Video+Thumbnail'; uploadDateTimeDiv.textContent = 'আপলোড: --'; highlightTableDiv.innerHTML = ''; highlightCountDiv.textContent = 'কপিরাইট: 0'; }
  async function copyToClipboard(text, buttonElement) { try { await navigator.clipboard.writeText(text); const originalText = buttonElement.textContent; buttonElement.textContent = 'Copied!'; setTimeout(() => { buttonElement.textContent = originalText; }, 2000); } catch (err) { showMessage('কপি করতে ব্যর্থ হয়েছে।', 'error'); } }
  function handleCopySelectedTags(container, button) { const selected = Array.from(container.querySelectorAll('span.selected')).map(el => el.textContent); if (selected.length > 0) copyToClipboard(selected.join(', '), button); else showMessage('প্রথমে কোনো ট্যাগ নির্বাচন করুন।', 'error'); }
  async function downloadImage(imageSrc, filename) { try { const response = await fetch(imageSrc, { mode: 'cors' }); const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = filename; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove(); } catch (error) { showMessage('থাম্বনেইল ডাউনলোড করতে সমস্যা হয়েছে।', 'error'); } }
  function formatNumber(num) { return num ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num) : '0'; }
  function formatDate(isoString, options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) { return isoString ? new Date(isoString).toLocaleString('bn-BD', options) : '--'; }
  function parseISO8601Duration(duration) { if (!duration) return 0; const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + (parseInt(match[3] || 0)); }
  function getCategoryName(id) { const cats = { '1': 'Film & Animation', '2': 'Autos & Vehicles', '10': 'Music', '15': 'Pets & Animals', '17': 'Sports', '19': 'Travel & Events', '20': 'Gaming', '22': 'People & Blogs', '23': 'Comedy', '24': 'Entertainment', '25': 'News & Politics', '26': 'Howto & Style', '27': 'Education', '28': 'Science & Technology', '29': 'Nonprofits & Activism' }; return cats[id] || 'Unknown'; }
  function getCountryFlagAndName(code) { if (!code) return 'Not available'; try { const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code); const flag = code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)); return `${flag} ${name}`; } catch (e) { return code; } }

})();