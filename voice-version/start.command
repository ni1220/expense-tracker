#!/bin/bash

# 切換到腳本所在的目錄
cd "$(dirname "$0")"

# 檢查是否已經建立過虛擬環境
if [ ! -d "venv" ]; then
    echo "初次啟動，正在設定環境並安裝相依套件..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# 啟動 Flask 應用程式 (背景執行)
python app.py &

# 等待 2 秒讓伺服器啟動
sleep 2

# 自動打開預設瀏覽器並前往 App 網址
open http://127.0.0.1:5555

echo "記帳 App 已啟動！您可以關閉此終端機視窗來停止伺服器。"
# 等待使用者中斷，以便關閉背景的 Flask
wait
