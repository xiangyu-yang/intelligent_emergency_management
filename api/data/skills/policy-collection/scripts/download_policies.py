#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件下载脚本

功能：从URL列表下载政策文件
"""

import argparse
import json
import os
import urllib.request
import urllib.error
from typing import List, Dict


def download_file(url: str, output_dir: str) -> Dict:
    """
    下载单个文件
    
    Args:
        url: 文件URL
        output_dir: 输出目录
    
    Returns:
        下载结果
    """
    try:
        filename = os.path.basename(url)
        
        if not filename:
            filename = f"policy_{hash(url) % 10000}.html"
        
        filepath = os.path.join(output_dir, filename)
        
        os.makedirs(output_dir, exist_ok=True)
        
        urllib.request.urlretrieve(url, filepath)
        
        return {
            'url': url,
            'filename': filename,
            'filepath': filepath,
            'size': os.path.getsize(filepath),
            'success': True
        }
    except urllib.error.URLError as e:
        return {
            'url': url,
            'filename': None,
            'filepath': None,
            'size': 0,
            'success': False,
            'error': str(e)
        }
    except Exception as e:
        return {
            'url': url,
            'filename': None,
            'filepath': None,
            'size': 0,
            'success': False,
            'error': str(e)
        }


def download_policies(urls: List[str], output_dir: str = './downloads') -> List[Dict]:
    """
    批量下载政策文件
    
    Args:
        urls: URL列表
        output_dir: 输出目录
    
    Returns:
        下载结果列表
    """
    results = []
    
    for i, url in enumerate(urls, 1):
        print(f"正在下载 [{i}/{len(urls)}]: {url}")
        result = download_file(url, output_dir)
        results.append(result)
        
        if result['success']:
            print(f"  ✓ 下载成功: {result['filename']}")
        else:
            print(f"  ✗ 下载失败: {result['error']}")
    
    return results


def main():
    parser = argparse.ArgumentParser(description='下载应急政策文件')
    parser.add_argument('--urls', type=str, required=True, help='URL列表文件')
    parser.add_argument('--output', type=str, default='./downloads', help='输出目录')
    parser.add_argument('--output-json', type=str, default='download_results.json', help='结果输出文件')
    
    args = parser.parse_args()
    
    with open(args.urls, 'r', encoding='utf-8') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    print(f"开始下载，共 {len(urls)} 个文件")
    
    results = download_policies(urls, args.output)
    
    success_count = sum(1 for r in results if r['success'])
    total_size = sum(r['size'] for r in results if r['success'])
    
    output = {
        'total': len(urls),
        'success': success_count,
        'failed': len(urls) - success_count,
        'total_size': total_size,
        'output_dir': args.output,
        'results': results
    }
    
    with open(args.output_json, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n下载完成: {success_count}/{len(urls)} 成功，总大小: {total_size} bytes")
    print(f"结果已保存到 {args.output_json}")


if __name__ == '__main__':
    main()