#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应急政策文件入库脚本

功能：将解析后的政策文件导入数据库
"""

import argparse
import json
import os
import sqlite3
from typing import List, Dict


def init_database(db_path: str) -> sqlite3.Connection:
    """
    初始化数据库
    
    Args:
        db_path: 数据库路径
    
    Returns:
        数据库连接
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            title TEXT,
            dates TEXT,
            keywords TEXT,
            sections TEXT,
            content_length INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS policy_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT NOT NULL,
            parent_id INTEGER,
            level INTEGER DEFAULT 1,
            description TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS policy_category_mapping (
            policy_id INTEGER,
            category_id INTEGER,
            FOREIGN KEY (policy_id) REFERENCES policies(id),
            FOREIGN KEY (category_id) REFERENCES policy_categories(id),
            PRIMARY KEY (policy_id, category_id)
        )
    ''')
    
    conn.commit()
    return conn


def import_policy(conn: sqlite3.Connection, policy_data: Dict) -> int:
    """
    导入单个政策文件
    
    Args:
        conn: 数据库连接
        policy_data: 政策文件数据
    
    Returns:
        插入的记录ID
    """
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO policies (
            filename, filepath, title, dates, keywords, sections, content_length
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        policy_data['filename'],
        policy_data['filepath'],
        policy_data['title'],
        json.dumps(policy_data['dates'], ensure_ascii=False),
        json.dumps(policy_data['keywords'], ensure_ascii=False),
        json.dumps(policy_data['sections'], ensure_ascii=False),
        policy_data['content_length']
    ))
    
    conn.commit()
    return cursor.lastrowid


def import_policies(input_dir: str, db_path: str) -> List[Dict]:
    """
    批量导入政策文件
    
    Args:
        input_dir: 输入目录（包含解析后的JSON文件）
        db_path: 数据库路径
    
    Returns:
        导入结果列表
    """
    results = []
    
    conn = init_database(db_path)
    
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file.endswith('.json'):
                filepath = os.path.join(root, file)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        policy_data = json.load(f)
                    
                    if policy_data.get('success'):
                        policy_id = import_policy(conn, policy_data)
                        results.append({
                            'filename': file,
                            'policy_id': policy_id,
                            'success': True
                        })
                        print(f"  ✓ 导入成功: {file} -> ID: {policy_id}")
                    else:
                        results.append({
                            'filename': file,
                            'policy_id': None,
                            'success': False,
                            'error': '解析失败的文件'
                        })
                        print(f"  ✗ 跳过解析失败的文件: {file}")
                except Exception as e:
                    results.append({
                        'filename': file,
                        'policy_id': None,
                        'success': False,
                        'error': str(e)
                    })
                    print(f"  ✗ 导入失败: {file} - {e}")
    
    conn.close()
    return results


def main():
    parser = argparse.ArgumentParser(description='导入应急政策文件到数据库')
    parser.add_argument('--input', type=str, required=True, help='输入目录')
    parser.add_argument('--db', type=str, default='policies.db', help='数据库文件')
    
    args = parser.parse_args()
    
    print(f"开始导入到数据库: {args.db}")
    
    results = import_policies(args.input, args.db)
    
    success_count = sum(1 for r in results if r['success'])
    
    print(f"\n导入完成: {success_count}/{len(results)} 成功")
    
    with open('import_results.json', 'w', encoding='utf-8') as f:
        json.dump({
            'total': len(results),
            'success': success_count,
            'failed': len(results) - success_count,
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print("结果已保存到 import_results.json")


if __name__ == '__main__':
    main()