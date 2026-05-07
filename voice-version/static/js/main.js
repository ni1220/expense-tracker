document.addEventListener('DOMContentLoaded', function() {
    
    // Toast Notification helper
    function showToast(message, isError = false) {
        const toastEl = document.getElementById('liveToast');
        const toastBody = document.getElementById('toastMessage');
        if (!toastEl || !toastBody) return;
        
        toastBody.textContent = message;
        if (isError) {
            toastEl.classList.remove('bg-success');
            toastEl.classList.add('bg-danger');
        } else {
            toastEl.classList.remove('bg-danger');
            toastEl.classList.add('bg-success');
        }
        
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    // --- Add Record Page Logic ---
    const addRecordForm = document.getElementById('addRecordForm');
    if (addRecordForm) {
        // Pre-fill date from URL or today's date
        const dateInput = document.getElementById('date');
        if (dateInput && !dateInput.value) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('date')) {
                dateInput.value = urlParams.get('date');
            } else {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }

        // Toggle Categories based on Type
        const typeRadios = document.querySelectorAll('input[name="type"]');
        const expenseCategories = document.getElementById('expenseCategories');
        const incomeCategories = document.getElementById('incomeCategories');
        
        typeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'income') {
                    expenseCategories.classList.add('d-none');
                    incomeCategories.classList.remove('d-none');
                    // auto select first income category
                    document.getElementById('catSalary').checked = true;
                } else {
                    incomeCategories.classList.add('d-none');
                    expenseCategories.classList.remove('d-none');
                    // auto select first expense category
                    document.getElementById('catFood').checked = true;
                }
            });
        });

        // AJAX Form Submission
        addRecordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showToast('記錄成功！');
                    // Clear amount and description for next input, keep date and type
                    document.getElementById('amount').value = '';
                    document.getElementById('description').value = '';
                    document.getElementById('amount').focus();
                } else {
                    showToast(result.error || '記錄失敗', true);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('發生錯誤', true);
            });
        });

        // --- Voice Recognition Logic ---
        const voiceBtn = document.getElementById('voiceBtn');
        const micIcon = document.getElementById('micIcon');
        
        if (voiceBtn) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'zh-TW';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;
                
                voiceBtn.addEventListener('click', function() {
                    recognition.start();
                    micIcon.textContent = '🎙️';
                    voiceBtn.classList.add('btn-danger');
                    voiceBtn.classList.remove('btn-outline-primary');
                    showToast('請開始說話...');
                });
                
                recognition.addEventListener('result', function(event) {
                    const transcript = event.results[0][0].transcript;
                    
                    // 1. Extract numbers with Chinese units
                    function parseAmount(text) {
                        // 移除貨幣符號與千分位逗號，例如 "$10,000" -> "10000"
                        let s = text.replace(/[$,，]/g, '');
                        
                        const numMap = {'一':'1', '二':'2', '兩':'2', '三':'3', '四':'4', '五':'5', '六':'6', '七':'7', '八':'8', '九':'9', '零':'0'};
                        for (let k in numMap) s = s.split(k).join(numMap[k]);
                        
                        let match = s.match(/[0-9]+(?:[萬千百十][0-9]*)+|[0-9]+/);
                        if (!match) return null;
                        
                        let numStr = match[0];
                        if (/^[0-9]+$/.test(numStr)) return parseInt(numStr, 10);
                        
                        numStr = numStr.replace(/([萬])([0-9]+)$/, '$1$2千')
                                       .replace(/([千])([0-9]+)$/, '$1$2百')
                                       .replace(/([百])([0-9]+)$/, '$1$2十');
                        
                        let total = 0, temp = "";
                        for(let char of numStr) {
                            if (/[0-9]/.test(char)) {
                                temp += char;
                            } else {
                                let n = temp ? parseInt(temp, 10) : 0;
                                if (char === '萬') total += n * 10000;
                                else if (char === '千') total += n * 1000;
                                else if (char === '百') total += n * 100;
                                else if (char === '十') total += n * 10;
                                temp = "";
                            }
                        }
                        if (temp) total += parseInt(temp, 10);
                        return total;
                    }

                    const extractedAmount = parseAmount(transcript);
                    if (extractedAmount) {
                        document.getElementById('amount').value = extractedAmount;
                    }
                    
                    // 2. Keyword mapping for categories
                    const categoryKeywords = {
                        // Expenses
                        'catFood': ['吃', '喝', '餐', '咖啡', '飲料', '早', '午', '晚', '飯', '麵', '星巴克', '麥當勞', '肯德基', '摩斯', '手搖', '五十嵐', '麻古', '餐廳', '便當', '宵夜'],
                        'catTransport': ['車', '捷運', '公車', '計程車', '停車', '加油', '高鐵', '台鐵', 'uber', 'yoxi', '55688', '客運', '火車', '機票'],
                        'catEntertainment': ['玩', '電影', '唱歌', '遊戲', '展覽', 'netflix', 'spotify', '迪士尼', '威秀', '訂閱'],
                        'catShopping': ['買', '衣服', '鞋子', '網購', '蝦皮', '全聯', '小七', '便利商店', 'momo', 'pchome', '淘寶', '好市多', '家樂福', '康是美', '屈臣氏'],
                        // Income
                        'catSalary': ['薪水', '工資', '發薪', '入帳', '薪資'],
                        'catBonus': ['獎金', '紅利', '年終', '分紅'],
                        'catInvestment': ['投資', '股息', '利息', '股票', '基金'],
                        'catIncomeOther': ['給我', '收到', '拿到', '匯給', '匯入']
                    };
                    
                    let matchedCategory = null;
                    for (const [catId, keywords] of Object.entries(categoryKeywords)) {
                        if (keywords.some(kw => transcript.includes(kw))) {
                            matchedCategory = catId;
                            break;
                        }
                    }
                    
                    if (matchedCategory) {
                        const isIncome = ['catSalary', 'catBonus', 'catInvestment', 'catIncomeOther'].includes(matchedCategory);
                        
                        if (isIncome) {
                            document.getElementById('typeIncome').checked = true;
                            expenseCategories.classList.add('d-none');
                            incomeCategories.classList.remove('d-none');
                        } else {
                            document.getElementById('typeExpense').checked = true;
                            expenseCategories.classList.remove('d-none');
                            incomeCategories.classList.add('d-none');
                        }
                        document.getElementById(matchedCategory).checked = true;
                    }
                    
                    // 3. Set description
                    document.getElementById('description').value = transcript;
                    
                    showToast(`語音解析完成: "${transcript}"`);
                });
                
                recognition.addEventListener('end', function() {
                    micIcon.textContent = '🎤';
                    voiceBtn.classList.remove('btn-danger');
                    voiceBtn.classList.add('btn-outline-primary');
                });
                
                recognition.addEventListener('error', function(event) {
                    showToast(`語音辨識錯誤: ${event.error}`, true);
                    micIcon.textContent = '🎤';
                    voiceBtn.classList.remove('btn-danger');
                    voiceBtn.classList.add('btn-outline-primary');
                });
            } else {
                voiceBtn.addEventListener('click', function() {
                    showToast('您的瀏覽器不支援語音辨識', true);
                });
            }
        }
    }

    // --- History Page Logic ---
    const deleteBtns = document.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!confirm('確定要刪除這筆紀錄嗎？')) return;
            
            const id = this.getAttribute('data-id');
            fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    document.getElementById(`row-${id}`).remove();
                    showToast('刪除成功');
                } else {
                    showToast('刪除失敗', true);
                }
            });
        });
    });
});
