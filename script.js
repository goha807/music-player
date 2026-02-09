// ==========================================
// НАЛАШТУВАННЯ
// ==========================================
const CONFIG = {
    API_KEY: 'AIzaSyDh1ctRZ0_pjyK5WbYUqBIhWoFL7kTX8EU', // Твій ключ
    MAX_RESULTS: 15
};

// ==========================================
// ДОДАТОК
// ==========================================
const app = {
    player: null,
    isPlaying: false,
    favorites: JSON.parse(localStorage.getItem('vt_favs_v2')) || [],
    currentTrack: null,
    progressInterval: null,

    init: function() {
        // Завантаження YouTube API
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Слухачі подій
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') app.search();
        });
        
        // Повзунок перемотки
        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('input', function() {
            if(app.player && app.player.duration) {
                const seekTo = app.player.getDuration() * (this.value / 100);
                app.player.seekTo(seekTo, true);
            }
        });

        // Повзунок гучності
        document.getElementById('volume-bar').addEventListener('input', function() {
            if(app.player) app.player.setVolume(this.value);
        });

        // Завантаження бібліотеки
        app.renderLibrary();
    },

    // Пошук музики
    search: async function() {
        const query = document.getElementById('search-input').value;
        if (!query) return;

        const container = document.getElementById('search-results');
        container.innerHTML = '<div class="placeholder-text">Шукаю... 🎵</div>';

        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&videoCategoryId=10&type=video&q=${encodeURIComponent(query)}&maxResults=${CONFIG.MAX_RESULTS}&key=${CONFIG.API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                alert('Помилка API: ' + data.error.message);
                return;
            }

            app.renderGrid(data.items, container, false);
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="placeholder-text">Помилка мережі :(</div>';
        }
    },

    // Відображення карток
    renderGrid: function(items, container, isLib) {
        container.innerHTML = '';
        if(items.length === 0) {
            container.innerHTML = '<div class="placeholder-text">Нічого не знайдено</div>';
            return;
        }

        items.forEach(item => {
            const videoId = isLib ? item.id : item.id.videoId;
            const title = item.snippet.title;
            const thumb = item.snippet.thumbnails.medium.url;
            const isFav = app.favorites.some(f => f.id === videoId);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${thumb}" alt="${title}">
                <div class="card-title">${title}</div>
                <div class="card-desc">
                    <span>YouTube</span>
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleFav('${videoId}', '${title.replace(/'/g, "\\'")}', '${thumb}')">
                        <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                    </button>
                </div>
            `;
            
            // Клік по картці запускає трек
            card.onclick = () => app.loadTrack(videoId, title, thumb);
            container.appendChild(card);
        });
    },

    // Логіка Улюбленого
    toggleFav: function(id, title, thumb) {
        const idx = app.favorites.findIndex(f => f.id === id);
        if (idx === -1) {
            app.favorites.push({ id, snippet: { title, thumbnails: { medium: { url: thumb } } } });
        } else {
            app.favorites.splice(idx, 1);
        }
        localStorage.setItem('vt_favs_v2', JSON.stringify(app.favorites));
        
        // Оновлюємо інтерфейс
        app.renderLibrary();
        if(document.getElementById('view-search').style.display !== 'none') {
            app.search(); // Оновити сердечка в пошуку
        }
    },

    renderLibrary: function() {
        const libContainer = document.getElementById('library-results');
        app.renderGrid(app.favorites, libContainer, true);
    },

    // Плеєр
    loadTrack: function(id, title, thumb) {
        if (app.player) {
            app.player.loadVideoById(id);
            app.currentTrack = { id, title };
            
            document.getElementById('current-title').innerText = title;
            document.getElementById('current-thumb').src = thumb;
            document.getElementById('play-icon').className = 'fa-solid fa-circle-pause';
            app.isPlaying = true;
        }
    },

    togglePlay: function() {
        if (!app.player) return;
        const state = app.player.getPlayerState();
        if (state === 1) {
            app.player.pauseVideo();
        } else {
            app.player.playVideo();
        }
    },

    updateProgress: function() {
        if (!app.player || !app.isPlaying) return;
        
        const currentTime = app.player.getCurrentTime();
        const duration = app.player.getDuration();
        
        if (duration) {
            const percent = (currentTime / duration) * 100;
            document.getElementById('progress-bar').value = percent;
            
            document.getElementById('current-time').innerText = app.formatTime(currentTime);
            document.getElementById('duration').innerText = app.formatTime(duration);
        }
    },

    formatTime: function(s) {
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    },
    
    // Текст пісні (Google Search)
    findLyrics: function() {
        if(!app.currentTrack) return alert("Спочатку включи трек!");
        // Прибираємо зайві слова з назви для кращого пошуку
        const cleanTitle = app.currentTrack.title.replace(/(\(|\[).*?(\)|\])/g, "").replace("Official Video", ""); 
        const url = `https://www.google.com/search?q=lyrics+${encodeURIComponent(cleanTitle)}`;
        window.open(url, '_blank');
    },

    switchTab: function(tabName) {
        document.querySelectorAll('nav li').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.view').forEach(el => el.style.display = 'none');

        document.getElementById(`nav-${tabName}`).classList.add('active');
        document.getElementById(`view-${tabName}`).style.display = 'block';
    }
};

// YouTube API Callback (має бути глобальним)
function onYouTubeIframeAPIReady() {
    app.player = new YT.Player('yt-placeholder', {
        height: '0',
        width: '0',
        playerVars: { 'autoplay': 0, 'controls': 0 },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    const playBtn = document.getElementById('play-icon');
    if (event.data === YT.PlayerState.PLAYING) {
        app.isPlaying = true;
        playBtn.className = 'fa-solid fa-circle-pause';
        app.progressInterval = setInterval(app.updateProgress, 1000);
    } else {
        app.isPlaying = false;
        playBtn.className = 'fa-solid fa-circle-play';
        clearInterval(app.progressInterval);
    }
}

// Старт
app.init();