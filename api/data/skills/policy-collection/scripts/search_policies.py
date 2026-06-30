#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件搜索脚本

功能：根据关键词和分类搜索政策文件
"""

import argparse
import json
import os
import re
from typing import List, Dict, Optional


def search_policies(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    date_range: Optional[Dict[str, str]] = None,
    source_dir: str = './reference'
) -> List[Dict]:
    """
    搜索政策文件
    
    Args:
        keyword: 搜索关键词
        category: 政策分类
        date_range: 日期范围
        source_dir: 搜索目录
    
    Returns:
        搜索结果列表
    """
    results = []
    
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            file_path = os.path.join(root, file)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except:
                continue
            
            # 检查关键词
            if keyword and keyword.lower() not in content.lower():
                continue
            
            # 检查分类
            if category and category.lower() not in content.lower():
                continue
            
            # 检查日期范围
            if date_range:
                if not check_date_in_range(content, date_range):
                    continue
            
            results.append({
                'filename': file,
                'filepath': file_path,
                'size': os.path.getsize(file_path),
                'last_modified': os.path.getmtime(file_path),
                'preview': content[:200] + '...' if len(content) > 200 else content
            })
    
    return results


def check_date_in_range(content: str, date_range: Dict[str, str]) -> bool:
    """
    检查内容中的日期是否在指定范围内
    
    Args:
        content: 文件内容
        date_range: 日期范围 {'start': '2024-01-01', 'end': '2024-12-31'}
    
    Returns:
        是否在范围内
    """
    date_pattern = r'\d{4}[-/]\d{2}[-/]\d{2}'
    dates = re.findall(date_pattern, content)
    
    for date in dates:
        if date_range['start'] <= date <= date_range['end']:
            return True
    
    return False


def main():
    parser = argparse.ArgumentParser(description='搜索应急政策文件')
    parser.add_argument('--keyword', type=str, help='搜索关键词')
    parser.add_argument('--category', type=str, help='政策分类')
    parser.add_argument('--start-date', type=str, help='开始日期 (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, help='结束日期 (YYYY-MM-DD)')
    parser.add_argument('--output', type=str, default='search_results.json', help='输出文件')
    
    args = parser.parse_args()
    
    date_range = None
    if args.start_date and args.end_date:
        date_range = {'start': args.start_date, 'end': args.end_date}
    
    results = search_policies(
        keyword=args.keyword,
        category=args.category,
        date_range=date_range
    )
    
    output = {
        'total': len(results),
        'keyword': args.keyword,
        'category': args.category,
        'date_range': date_range,
        'results': results
    }
    
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"搜索完成，共找到 {len(results)} 个文件，结果已保存到 {args.output}")


if __name__ == '__main__':
    main()