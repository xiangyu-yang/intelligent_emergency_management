#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件解析脚本
解析HTML和PDF文件内容
"""

import json
import argparse
import re
from pathlib import Path
from bs4 import BeautifulSoup
from typing import Dict, List

class PolicyParser:
    def __init__(self):
        pass
    
    def _clean_text(self, text: str) -> str:
        """清理文本内容"""
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text
    
    def parse_html(self, file_path: str) -> Dict:
        """解析HTML文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            soup = BeautifulSoup(content, 'html.parser')
            
            title_selectors = ['h1.title', 'div.article h1', 'h1', '.article-title']
            title = ""
            for selector in title_selectors:
                element = soup.select_one(selector)
                if element:
                    title = element.get_text(strip=True)
                    break
            
            content_selectors = ['div.content', 'div.article_content', 'div.TRS_Editor', '.article-content', 'article']
            body_content = ""
            for selector in content_selectors:
                element = soup.select_one(selector)
                if element:
                    body_content = self._clean_text(element.get_text())
                    break
            
            if not body_content:
                body_content = self._clean_text(soup.get_text())
            
            info_selectors = ['span.source', 'div.info', 'span.origin']
            source = ""
            for selector in info_selectors:
                element = soup.select_one(selector)
                if element:
                    source = element.get_text(strip=True)
                    break
            
            date_selectors = ['span.time', 'span.date', 'div.info span']
            publish_date = ""
            for selector in date_selectors:
                element = soup.select_one(selector)
                if element:
                    date_match = re.search(r'(\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月\d{1,2}日)', element.get_text())
                    if date_match:
                        publish_date = date_match.group(1)
                    break
            
            return {
                "title": title,
                "content": body_content[:10000] if body_content else "",
                "source": source,
                "publishDate": publish_date,
                "documentType": "html",
                "success": True
            }
            
        except Exception as e:
            return {
                "title": "",
                "content": "",
                "source": "",
                "publishDate": "",
                "documentType": "html",
                "success": False,
                "error": str(e)
            }
    
    def parse_pdf(self, file_path: str) -> Dict:
        """解析PDF文件"""
        try:
            import pdfplumber
            
            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text
                
                text = self._clean_text(text)
                
                title = text[:200].split('\n')[0] if text else ""
                
                return {
                    "title": title,
                    "content": text[:20000] if text else "",
                    "source": "应急管理部公报",
                    "publishDate": "",
                    "documentType": "pdf",
                    "success": True
                }
                
        except ImportError:
            return {
                "title": "",
                "content": "",
                "source": "",
                "publishDate": "",
                "documentType": "pdf",
                "success": False,
                "error": "请安装pdfplumber: pip install pdfplumber"
            }
        except Exception as e:
            return {
                "title": "",
                "content": "",
                "source": "",
                "publishDate": "",
                "documentType": "pdf",
                "success": False,
                "error": str(e)
            }
    
    def parse_file(self, file_path: str) -> Dict:
        """根据文件类型解析"""
        path = Path(file_path)
        
        if path.suffix.lower() == '.pdf':
            return self.parse_pdf(file_path)
        elif path.suffix.lower() in ['.html', '.htm', '.shtml']:
            return self.parse_html(file_path)
        elif path.suffix.lower() in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {
                "title": path.stem,
                "content": content,
                "source": "",
                "publishDate": "",
                "documentType": "text",
                "success": True
            }
        else:
            return {
                "title": path.name,
                "content": "",
                "source": "",
                "publishDate": "",
                "documentType": path.suffix[1:],
                "success": False,
                "error": f"不支持的文件类型: {path.suffix}"
            }
    
    def parse_directory(self, input_dir: str) -> List[Dict]:
        """解析目录中的所有文件"""
        input_path = Path(input_dir)
        
        if not input_path.exists():
            return []
        
        results = []
        
        for file_path in input_path.rglob('*'):
            if file_path.is_file():
                print(f"正在解析: {file_path.name}")
                result = self.parse_file(str(file_path))
                result["filePath"] = str(file_path)
                results.append(result)
        
        return results

def main():
    parser = argparse.ArgumentParser(description='应急政策文件解析脚本')
    parser.add_argument('--input', type=str, required=True, help='输入文件或目录路径')
    parser.add_argument('--output', type=str, default='parsed', help='输出目录')
    
    args = parser.parse_args()
    
    print("🚀 开始解析应急政策文件...")
    
    policy_parser = PolicyParser()
    
    input_path = Path(args.input)
    
    if input_path.is_file():
        results = [policy_parser.parse_file(str(input_path))]
    else:
        results = policy_parser.parse_directory(str(input_path))
    
    success_count = sum(1 for r in results if r['success'])
    
    output_path = Path(args.output)
    output_path.mkdir(parents=True, exist_ok=True)
    
    output_file = output_path / "parsed_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "totalCount": len(results),
            "successCount": success_count,
            "results": results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n📊 解析完成，成功 {success_count}/{len(results)}")
    print(f"✅ 解析结果已保存到: {output_file}")

if __name__ == '__main__':
    main()
