#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件下载脚本
下载政策文件（支持HTML和PDF）
"""

import requests
import json
import argparse
import time
from pathlib import Path
from typing import List, Dict

class PolicyDownloader:
    def __init__(self, config_path: str = None):
        self.base_url = "https://www.mem.gov.cn"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.mem.gov.cn/gk/"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def download_file(self, url: str, output_dir: str) -> str:
        """下载单个文件"""
        try:
            response = self.session.get(url, timeout=60, stream=True)
            response.encoding = 'utf-8'
            
            if response.status_code != 200:
                print(f"❌ 下载失败: {url} ({response.status_code})")
                return ""
            
            file_name = url.split('/')[-1]
            if not file_name:
                file_name = f"policy_{int(time.time())}.html"
            
            output_path = Path(output_dir) / file_name
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"✅ 下载成功: {file_name}")
            return str(output_path)
            
        except Exception as e:
            print(f"❌ 下载异常: {url} - {str(e)}")
            return ""
    
    def download_policies(self, policies: List[Dict], output_dir: str) -> List[Dict]:
        """批量下载政策文件"""
        html_dir = Path(output_dir) / "html"
        pdf_dir = Path(output_dir) / "pdf"
        
        html_dir.mkdir(parents=True, exist_ok=True)
        pdf_dir.mkdir(parents=True, exist_ok=True)
        
        results = []
        
        for i, policy in enumerate(policies, 1):
            url = policy['url']
            title = policy['title']
            document_type = policy.get('documentType', 'html')
            
            print(f"\n[{i}/{len(policies)}] 正在下载: {title}")
            
            if document_type == 'pdf' or url.endswith('.pdf'):
                save_path = self.download_file(url, str(pdf_dir))
            else:
                save_path = self.download_file(url, str(html_dir))
            
            results.append({
                "title": title,
                "url": url,
                "documentType": document_type,
                "savePath": save_path,
                "success": bool(save_path)
            })
            
            time.sleep(2)
        
        return results

def main():
    parser = argparse.ArgumentParser(description='应急政策文件下载脚本')
    parser.add_argument('--urls', type=str, help='URL列表文件路径（每行一个URL）')
    parser.add_argument('--json', type=str, help='JSON文件路径（包含政策列表）')
    parser.add_argument('--output', type=str, default='downloads', help='输出目录')
    parser.add_argument('--config', type=str, help='配置文件路径')
    
    args = parser.parse_args()
    
    print("🚀 开始下载应急政策文件...")
    
    downloader = PolicyDownloader(args.config)
    
    policies = []
    
    if args.urls:
        with open(args.urls, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f if line.strip()]
        
        policies = [{"url": url, "title": url.split('/')[-1], "documentType": "pdf" if url.endswith('.pdf') else "html"} 
                    for url in urls]
    
    elif args.json:
        with open(args.json, 'r', encoding='utf-8') as f:
            data = json.load(f)
            policies = data.get('policies', data)
    
    else:
        print("❌ 请提供 --urls 或 --json 参数")
        return
    
    results = downloader.download_policies(policies, args.output)
    
    success_count = sum(1 for r in results if r['success'])
    print(f"\n📊 下载完成，成功 {success_count}/{len(results)}")
    
    output_path = Path(args.output) / "download_results.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "totalCount": len(results),
            "successCount": success_count,
            "results": results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 下载结果已保存到: {output_path}")

if __name__ == '__main__':
    main()
