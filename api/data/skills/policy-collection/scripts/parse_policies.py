#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件解析脚本

功能：解析下载的政策文件，提取关键信息
"""

import argparse
import json
import os
import re
from typing import List, Dict


def parse_text_file(filepath: str) -> Dict:
    """
    解析文本文件
    
    Args:
        filepath: 文件路径
    
    Returns:
        解析结果
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 提取标题
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else os.path.basename(filepath)
        
        # 提取日期
        date_pattern = r'\d{4}[-/]\d{2}[-/]\d{2}'
        dates = re.findall(date_pattern, content)
        
        # 提取关键词
        keywords = set()
        keyword_pattern = r'(应急|预案|安全|灾害|事故|救援)'
        for match in re.finditer(keyword_pattern, content):
            keywords.add(match.group(1))
        
        # 提取章节
        sections = []
        section_pattern = r'^(#{2,3})\s+(.+)$'
        for match in re.finditer(section_pattern, content):
            sections.append({
                'level': len(match.group(1)),
                'title': match.group(2)
            })
        
        return {
            'filename': os.path.basename(filepath),
            'filepath': filepath,
            'title': title,
            'dates': dates,
            'keywords': list(keywords),
            'sections': sections,
            'content_length': len(content),
            'success': True
        }
    except Exception as e:
        return {
            'filename': os.path.basename(filepath),
            'filepath': filepath,
            'title': None,
            'dates': [],
            'keywords': [],
            'sections': [],
            'content_length': 0,
            'success': False,
            'error': str(e)
        }


def parse_policies(input_dir: str, output_dir: str = './parsed') -> List[Dict]:
    """
    批量解析政策文件
    
    Args:
        input_dir: 输入目录
        output_dir: 输出目录
    
    Returns:
        解析结果列表
    """
    results = []
    os.makedirs(output_dir, exist_ok=True)
    
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            filepath = os.path.join(root, file)
            
            if file.endswith('.md') or file.endswith('.txt') or file.endswith('.json'):
                print(f"正在解析: {file}")
                result = parse_text_file(filepath)
                results.append(result)
                
                if result['success']:
                    output_file = os.path.join(output_dir, f"{os.path.splitext(file)[0]}.json")
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    print(f"  ✓ 解析成功")
                else:
                    print(f"  ✗ 解析失败: {result['error']}")
            else:
                print(f"  跳过不支持的格式: {file}")
    
    return results


def main():
    parser = argparse.ArgumentParser(description='解析应急政策文件')
    parser.add_argument('--input', type=str, required=True, help='输入目录')
    parser.add_argument('--output', type=str, default='./parsed', help='输出目录')
    parser.add_argument('--output-json', type=str, default='parse_results.json', help='结果输出文件')
    
    args = parser.parse_args()
    
    print(f"开始解析目录: {args.input}")
    
    results = parse_policies(args.input, args.output)
    
    success_count = sum(1 for r in results if r['success'])
    
    output = {
        'total': len(results),
        'success': success_count,
        'failed': len(results) - success_count,
        'input_dir': args.input,
        'output_dir': args.output,
        'results': results
    }
    
    with open(args.output_json, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n解析完成: {success_count}/{len(results)} 成功")
    print(f"结果已保存到 {args.output_json}")


if __name__ == '__main__':
    main()