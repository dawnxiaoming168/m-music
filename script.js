document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');
    const cover = document.getElementById('cover');
    const songTitle = document.getElementById('songTitle');
    const artist = document.getElementById('artist');
    const lyricsDiv = document.getElementById('lyrics');
    const currentTime = document.querySelector('.current-time');
    const totalTime = document.querySelector('.total-time');
    const playerElement = document.getElementById('player');
    const lyricsElement = document.getElementById('lyrics');
    const speedBtn = document.getElementById('speedBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const muteBtn = document.getElementById('muteBtn');
    const moreBtn = document.getElementById('moreBtn');
    const moreMenu = document.querySelector('.more-menu');
    const downloadBtn = document.getElementById('downloadBtn');
    const speedSelect = document.getElementById('speedSelect');
    const qualitySelect = document.getElementById('qualitySelect');

    // 初始化变量
    let audio = new Audio();
    let isPlaying = false;
    let currentLyrics = [];
    let currentSongIndex = null;
    let songsList = [];
    let currentKeyword = '';
    let lastVolume = 1;

    // 格式化时间的函数
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 搜索音乐
    async function searchMusic(keyword) {
        try {
            currentKeyword = keyword;
            const response = await fetch(`https://www.hhlqilongzhu.cn/api/dg_wyymusic.php?gm=${encodeURIComponent(keyword)}&num=60`);
            const text = await response.text();
            
            // 处理搜索结果
            const songs = text.split('\n').filter(line => line.trim());
            
            // 如果没有搜索结果，隐藏播放器
            if (songs.length === 0) {
                playerElement.classList.add('hidden');
                lyricsElement.classList.add('hidden');
            }
            
            displaySearchResults(songs);
        } catch (error) {
            console.error('搜索失败:', error);
            searchResults.innerHTML = '<li>搜索失败，请重试</li>';
            // 搜索失败时也隐藏播放器
            playerElement.classList.add('hidden');
            lyricsElement.classList.add('hidden');
        }
    }

    // 显示搜索结果
    function displaySearchResults(songs) {
        searchResults.innerHTML = songs
            .map(song => {
                const match = song.match(/(\d+)、(.+)/);
                if (match) {
                    const [_, index, songInfo] = match;
                    return `<li data-index="${index}" data-number="${index}、">${songInfo}</li>`;
                }
                return '';
            })
            .join('');
    }

    // 播放音乐
    async function playMusic(index) {
        try {
            // 获取当前选择的音质
            const quality = qualitySelect.value;
            
            const response = await fetch(`https://www.hhlqilongzhu.cn/api/dg_wyymusic.php?gm=${encodeURIComponent(currentKeyword)}&n=${index}&type=json&num=60&br=${quality}`);
            const data = await response.json();

            if (data.code === 200) {
                // 显示播放器和歌词
                playerElement.classList.remove('hidden');
                lyricsElement.classList.remove('hidden');
                // 添加淡入效果
                playerElement.classList.add('fade-in');
                lyricsElement.classList.add('fade-in');
                
                currentSongIndex = index;
                updatePlayer(data);
                updateActiveSong();
            }
        } catch (error) {
            console.error('播放失败:', error);
            alert('播放失败，请重试');
        }
    }

    // 更新播放器
    function updatePlayer(data) {
        // 更新音频
        audio.src = data.music_url;
        audio.play().catch(console.error);
        isPlaying = true;
        playBtn.textContent = '⏸️';

        // 更新界面
        songTitle.textContent = data.title;
        artist.textContent = data.singer;
        
        // 更新封面
        if (data.cover) {
            cover.src = data.cover;
            // 更新容器背景
            document.querySelector('.container').style.setProperty(
                '--bg-image',
                `url(${data.cover})`
            );
        }
        cover.onerror = () => {
            cover.src = 'https://via.placeholder.com/120';
            // 重置容器背景
            document.querySelector('.container').style.setProperty(
                '--bg-image',
                'none'
            );
        };

        // 处理歌词
        if (data.lrc) {
            parseLyrics(data.lrc);
        } else {
            lyricsDiv.innerHTML = '<p class="no-lyrics">暂无歌词</p>';
        }

        // 开始旋转封面
        cover.classList.add('rotating');

        // 监听音频加载完成事件，更新总时长
        audio.addEventListener('loadedmetadata', () => {
            totalTime.textContent = formatTime(audio.duration);
        });

        // 初始化音量
        audio.volume = volumeSlider.value / 100;
        updateVolumeIcon(audio.volume);

        // 重置播放速度为 1.0
        speedSelect.value = "1.0";
        audio.playbackRate = 1.0;
    }

    // 解析歌词
    function parseLyrics(lrcText) {
        currentLyrics = lrcText.split('\n')
            .map(line => {
                const match = line.match(/\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/);
                if (match) {
                    return {
                        time: parseInt(match[1]) * 60 + parseFloat(match[2]),
                        text: match[3].trim()
                    };
                }
                return null;
            })
            .filter(lyric => lyric && lyric.text);

        updateLyrics(0);
    }

    // 更新歌词显示
    function updateLyrics(currentTime) {
        if (!currentLyrics.length) return;

        const currentLyric = currentLyrics.reduce((prev, curr) => 
            (curr.time <= currentTime) ? curr : prev
        );

        const html = currentLyrics
            .map(lyric => `<p class="${lyric === currentLyric ? 'active' : ''}">${lyric.text}</p>`)
            .join('');

        lyricsDiv.innerHTML = html;

        // 自动滚动到当前歌词
        const activeLyric = lyricsDiv.querySelector('.active');
        if (activeLyric) {
            const containerHeight = lyricsDiv.offsetHeight;
            const lyricHeight = activeLyric.offsetHeight;
            const lyricTop = activeLyric.offsetTop;
            
            const scrollTo = lyricTop - (containerHeight / 2) + (lyricHeight / 2);
            lyricsDiv.scrollTop = scrollTo;
        }
    }

    // 更新当前播放歌曲高亮
    function updateActiveSong() {
        document.querySelectorAll('#searchResults li').forEach(li => {
            li.classList.toggle('active', li.dataset.index === currentSongIndex);
        });
    }

    // 事件监听器
    searchBtn.addEventListener('click', () => {
        const keyword = searchInput.value.trim();
        if (keyword) searchMusic(keyword);
    });

    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') searchBtn.click();
    });

    searchResults.addEventListener('click', e => {
        if (e.target.tagName === 'LI') {
            playMusic(e.target.dataset.index);
        }
    });

    playBtn.addEventListener('click', () => {
        if (!audio.src) return;
        if (isPlaying) {
            audio.pause();
            playBtn.textContent = '▶️';
            cover.classList.add('paused');
        } else {
            audio.play();
            playBtn.textContent = '⏸️';
            cover.classList.remove('paused');
        }
        isPlaying = !isPlaying;
    });

    // 修改上一首下一首功能
    function playPrevious() {
        if (!currentSongIndex) return;
        
        const prevIndex = parseInt(currentSongIndex) - 1;
        if (prevIndex > 0) {  // 确保不会小于1
            playMusic(prevIndex.toString());
        }
    }

    function playNext() {
        if (!currentSongIndex) return;
        
        // 获取搜索结果列表中的所有歌曲
        const songItems = document.querySelectorAll('#searchResults li');
        const nextIndex = parseInt(currentSongIndex) + 1;
        
        // 检查是否存在下一首歌
        if (nextIndex <= songItems.length) {
            playMusic(nextIndex.toString());
        }
    }

    // 修改事件监听器
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);

    // 修改音频结束事件
    audio.addEventListener('ended', () => {
        playNext();  // 播放结束后自动播放下一首
        cover.classList.remove('rotating');
        currentTime.textContent = '00:00';
    });

    // 添加进度条拖动功能
    let isDragging = false;

    progressContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        progressContainer.classList.add('dragging');
        updateProgress(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateProgress(e);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            progressContainer.classList.remove('dragging');
        }
    });

    // 更新进度条函数
    function updateProgress(e) {
        if (!audio.duration) return;
        const rect = progressContainer.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        // 限制百分比在 0-1 之间
        percent = Math.min(1, Math.max(0, percent));
        
        // 更新进度条显示
        progressBar.style.width = `${percent * 100}%`;
        
        // 如果是鼠标抬起或点击，则更新音频时间
        if (!isDragging || e.type === 'mousedown') {
            audio.currentTime = percent * audio.duration;
        }
    }

    // 添加触摸事件支持
    progressContainer.addEventListener('touchstart', handleTouch);
    progressContainer.addEventListener('touchmove', handleTouch);
    progressContainer.addEventListener('touchend', () => {
        progressContainer.classList.remove('dragging');
    });

    function handleTouch(e) {
        e.preventDefault();
        progressContainer.classList.add('dragging');
        const touch = e.touches[0];
        updateProgress(touch);
    }

    // 音频事件
    audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${percent}%`;
        currentTime.textContent = formatTime(audio.currentTime);
        updateLyrics(audio.currentTime);
    });

    // 在音频加载失败时停止旋转
    audio.addEventListener('error', () => {
        cover.classList.remove('rotating');
        playerElement.classList.add('hidden');
        lyricsElement.classList.add('hidden');
    });

    // 音量滑块事件
    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        audio.volume = volume;
        updateVolumeIcon(volume);
        if (volume > 0) {
            lastVolume = volume;
        }
    });

    // 静音按钮事件
    muteBtn.addEventListener('click', () => {
        if (audio.volume > 0) {
            audio.volume = 0;
            volumeSlider.value = 0;
            updateVolumeIcon(0);
        } else {
            audio.volume = lastVolume;
            volumeSlider.value = lastVolume * 100;
            updateVolumeIcon(lastVolume);
        }
    });

    // 更新音量图标
    function updateVolumeIcon(volume) {
        if (volume === 0) {
            muteBtn.textContent = '🔇';
        } else if (volume < 0.5) {
            muteBtn.textContent = '🔉';
        } else {
            muteBtn.textContent = '🔊';
        }
    }

    // 更多选项菜单显示/隐藏
    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle('hidden');
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
        if (!moreMenu.contains(e.target) && !moreBtn.contains(e.target)) {
            moreMenu.classList.add('hidden');
        }
    });

    // 下载功能
    downloadBtn.addEventListener('click', async () => {
        if (audio.src) {
            try {
                const songName = songTitle.textContent || 'unknown';
                const artistName = artist.textContent || 'unknown';
                const fileName = `${songName}-${artistName}.mp3`;
                
                // 创建下载提示
                const toast = document.createElement('div');
                toast.className = 'toast-message';
                toast.textContent = '准备下载...';
                document.body.appendChild(toast);

                // 获取音乐文件
                const response = await fetch(audio.src);
                if (!response.ok) throw new Error('下载失败');
                
                // 转换为 blob
                const blob = await response.blob();
                
                // 创建下载链接
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                
                // 更新提示
                toast.textContent = '开始下载...';
                
                // 开始下载
                document.body.appendChild(a);
                a.click();
                
                // 清理
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                // 显示成功提示
                setTimeout(() => {
                    toast.textContent = '下载完成！';
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 2000);
                }, 1000);
                
            } catch (error) {
                console.error('下载失败:', error);
                
                // 显示错误提示
                const errorToast = document.createElement('div');
                errorToast.className = 'toast-message error';
                errorToast.textContent = '下载失败，请重试';
                document.body.appendChild(errorToast);
                
                setTimeout(() => {
                    document.body.removeChild(errorToast);
                }, 3000);
            }
        }
    });

    // 防止菜单内部点击关闭菜单
    moreMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 播放速度控制
    speedSelect.addEventListener('change', (e) => {
        const newSpeed = parseFloat(e.target.value);
        audio.playbackRate = newSpeed;
    });

    // 添加音质切换事件监听
    qualitySelect.addEventListener('change', () => {
        // 如果当前正在播放音乐，则重新加载当前音乐
        if (currentSongIndex) {
            // 创建切换提示
            const toast = document.createElement('div');
            toast.className = 'toast-message';
            toast.textContent = '切换音质中...';
            document.body.appendChild(toast);
            
            // 记住当前播放位置
            const currentTime = audio.currentTime;
            
            // 重新加载当前歌曲
            playMusic(currentSongIndex).then(() => {
                // 恢复播放位置
                audio.currentTime = currentTime;
                
                // 更新提示
                toast.textContent = '音质切换成功';
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 2000);
            }).catch(() => {
                toast.textContent = '音质切换失败';
                toast.className = 'toast-message error';
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 2000);
            });
        }
    });
});
