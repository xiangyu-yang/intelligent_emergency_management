#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件搜索脚本
从国家应急管理部官方网站搜索政策文件
"""

import requests
from bs4 import BeautifulSoup
import json
import argparse
import time
import re
from typing import List, Dict, Optional
from pathlib import Path

class PolicySearcher:
    def __init__(self, config_path: str = None):
        self.base_url = "https://www.mem.gov.cn"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.mem.gov.cn/gk/"
        }
        self.config = self._load_config(config_path)
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def _load_config(self, config_path: Optional[str]) -> Dict:
        if config_path and Path(config_path).exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _extract_date(self, text: str) -> Optional[str]:
        patterns = [
            r'(\d{4}-\d{2}-\d{2})',
            r'(\d{4}年\d{1,2}月\d{1,2}日)',
            r'(\d{4}/\d{2}/\d{2})'
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
    
    def _build_full_url(self, url: str) -> str:
        if url.startswith('http'):
            return url
        if url.startswith('/'):
            return self.base_url + url
        return self.base_url + '/' + url
    
    def search_list_page(self, list_url: str) -> List[Dict]:
        """搜索列表页获取政策文件信息"""
        policies = []
        
        try:
            response = self.session.get(list_url, timeout=30)
            response.encoding = 'utf-8'
            
            if response.status_code != 200:
                print(f"❌ 请求失败: {list_url} ({response.status_code})")
                return policies
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            list_selectors = [
                "div.list ul li",
                "ul.list li",
                "div.news_list li",
                "div.newslist ul li",
                ".list li"
            ]
            
            items = []
            for selector in list_selectors:
                items = soup.select(selector)
                if items:
                    break
            
            if not items:
                items = soup.find_all('li')
            
            for item in items:
                try:
                    link = item.find('a')
                    if not link:
                        continue
                    
                    title = link.get_text(strip=True)
                    url = link.get('href', '')
                    
                    if not title or not url:
                        continue
                    
                    date_span = item.find('span', class_=re.compile(r'(date|time|time)'))
                    publish_date = self._extract_date(date_span.get_text(strip=True)) if date_span else None
                    
                    policies.append({
                        "title": title,
                        "url": self._build_full_url(url),
                        "publishDate": publish_date,
                        "category": self._infer_category(list_url),
                        "documentType": "pdf" if url.endswith('.pdf') else "html"
                    })
                except Exception as e:
                    continue
            
            print(f"✅ 从 {list_url} 获取到 {len(policies)} 条政策")
            
        except Exception as e:
            print(f"❌ 搜索列表页失败: {list_url} - {str(e)}")
        
        return policies
    
    def _infer_category(self, list_url: str) -> str:
        """从URL推断政策分类"""
        category_map = {
            '/gk/tzgg/bl/': '部令',
            '/gk/tzgg/tb/': '通报',
            '/gk/tzgg/yjbgg/': '公告',
            '/gk/tzgg/tz/': '通知',
            '/gk/tzgg/h/': '函',
            '/gk/tzgg/yj/': '意见',
            '/gk/tzgg/yjglbgg/': '公报',
            '/gk/tzgg/qt/': '其他',
            '/gk/sgcc/': '事故及灾害查处',
            '/gk/zcjd/': '政策解读',
            '/gk/ghjh/': '计划规划',
            '/gk/tjsj/': '统计数据'
        }
        
        for path, category in category_map.items():
            if path in list_url:
                return category
        return '其他'
    
    def search_by_keyword(self, keyword: str, category: str = None) -> List[Dict]:
        """按关键词搜索政策文件"""
        all_policies = []
        
        list_urls = [
            "https://www.mem.gov.cn/gk/tzgg/",
            "https://www.mem.gov.cn/gk/tzgg/bl/",
            "https://www.mem.gov.cn/gk/tzgg/tb/",
            "https://www.mem.gov.cn/gk/tzgg/yjbgg/",
            "https://www.mem.gov.cn/gk/tzgg/tz/",
            "https://www.mem.gov.cn/gk/tzgg/h/",
            "https://www.mem.gov.cn/gk/tzgg/yj/",
            "https://www.mem.gov.cn/gk/tzgg/yjglbgg/",
            "https://www.mem.gov.cn/gk/sgcc/",
            "https://www.mem.gov.cn/gk/zcjd/"
        ]
        
        if category:
            category_urls = {
                '部令': ["https://www.mem.gov.cn/gk/tzgg/bl/"],
                '通报': ["https://www.mem.gov.cn/gk/tzgg/tb/"],
                '公告': ["https://www.mem.gov.cn/gk/tzgg/yjbgg/"],
                '通知': ["https://www.mem.gov.cn/gk/tzgg/tz/"],
                '函': ["https://www.mem.gov.cn/gk/tzgg/h/"],
                '意见': ["https://www.mem.gov.cn/gk/tzgg/yj/"],
                '公报': ["https://www.mem.gov.cn/gk/tzgg/yjglbgg/"],
                '事故查处': ["https://www.mem.gov.cn/gk/sgcc/"],
                '政策解读': ["https://www.mem.gov.cn/gk/zcjd/"]
            }
            if category in category_urls:
                list_urls = category_urls[category]
        
        for list_url in list_urls:
            policies = self.search_list_page(list_url)
            
            if keyword:
                policies = [p for p in policies if keyword in p['title']]
            
            all_policies.extend(policies)
            
            delay = self.config.get('requestDelay', {}).get('listDelay', 3000)
            time.sleep(delay / 1000)
        
        return all_policies
    
    def search_all(self) -> List[Dict]:
        """搜索所有政策文件"""
        return self.search_by_keyword(None)

def main():
    parser = argparse.ArgumentParser(description='应急政策文件搜索脚本')
    parser.add_argument('--keyword', type=str, help='搜索关键词')
    parser.add_argument('--category', type=str, help='政策分类：部令/通报/公告/通知/函/意见/公报/事故查处/政策解读')
    parser.add_argument('--output', type=str, default='search_results.json', help='输出文件路径')
    parser.add_argument('--config', type=str, help='配置文件路径')
    
    args = parser.parse_args()
    
    print("🚀 开始搜索应急政策文件...")
    
    searcher = PolicySearcher(args.config)
    
    if args.keyword or args.category:
        policies = searcher.search_by_keyword(args.keyword, args.category)
    else:
        policies = searcher.search_all()
    
    print(f"\n📊 搜索完成，共找到 {len(policies)} 条政策文件")
    
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "totalCount": len(policies),
            "keyword": args.keyword,
            "category": args.category,
            "policies": policies
        }, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 结果已保存到: {output_path}")
    
    if policies:
        print("\n📋 前5条政策：")
        for i, policy in enumerate(policies[:5], 1):
            print(f"{i}. [{policy.get('category', '')}] {policy['title']}")
            print(f"   📅 {policy.get('publishDate', '未知日期')}")
            print(f"   🔗 {policy['url']}")
            print()

if __name__ == '__main__':
    main()
