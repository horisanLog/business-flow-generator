#!/usr/bin/env python3
"""
Miro Business Flow Exporter (Python版)
生成された業務フローをMiroボードに出力する
"""

import os
import json
import time
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()


class MiroExporter:
    """Miro APIを使って業務フローをエクスポートするクラス"""

    def __init__(self, access_token: Optional[str] = None, board_id: Optional[str] = None):
        self.access_token = access_token or os.getenv('MIRO_ACCESS_TOKEN')
        self.board_id = board_id or os.getenv('MIRO_BOARD_ID')
        self.base_url = 'https://api.miro.com/v2'

        if not self.access_token:
            raise ValueError('Miro access token が設定されていません')
        if not self.board_id:
            raise ValueError('Miro board ID が設定されていません')

        self.headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Miro APIにリクエストを送信"""
        url = f"{self.base_url}/boards/{self.board_id}/{endpoint}"

        try:
            if method == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method == 'PATCH':
                response = requests.patch(url, headers=self.headers, json=data)
            else:
                raise ValueError(f'サポートされていないメソッド: {method}')

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f'❌ API エラー: {e}')
            if hasattr(e.response, 'text'):
                print(f'詳細: {e.response.text}')
            raise

    def bring_shape_to_front(self, shape_id: str, x: int, y: int) -> None:
        """シェイプの位置を再更新してz-orderを前面にする"""
        data = {
            'position': {
                'x': x,
                'y': y,
                'origin': 'center'
            }
        }
        try:
            self._make_request('PATCH', f'shapes/{shape_id}', data)
        except Exception:
            pass  # z-order更新の失敗は無視

    def create_swimlane(self, name: str, x: int, y: int, width: int, height: int) -> Dict:
        """スイムレーンを作成（フレームで代用）"""
        frame_data = {
            'data': {
                'title': name,
                'type': 'freeform',
                'format': 'custom'
            },
            'geometry': {
                'width': width,
                'height': height
            },
            'position': {
                'x': x,
                'y': y,
                'origin': 'center'
            }
        }

        try:
            result = self._make_request('POST', 'frames', frame_data)
            print(f'✓ スイムレーン作成: {name}')
            return result
        except Exception as e:
            print(f'✗ スイムレーン作成失敗: {name} - {e}')
            raise

    def create_task_card(self, content: str, x: int, y: int,
                        width: int, height: int, metadata: Optional[Dict] = None) -> Dict:
        """タスクカードを作成"""
        metadata = metadata or {}

        card_content = f'<p style="font-size: 13px; margin: 2px 0;"><strong>{content}</strong></p>'
        if metadata.get('duration'):
            card_content += f'<p style="font-size: 10px; margin: 2px 0;">⏱️ {metadata["duration"]}</p>'
        if metadata.get('documents'):
            card_content += f'<p style="font-size: 9px; margin: 2px 0;">📄 {", ".join(metadata["documents"])}</p>'
        if metadata.get('systems'):
            card_content += f'<p style="font-size: 9px; margin: 2px 0;">💻 {", ".join(metadata["systems"])}</p>'

        card_data = {
            'data': {
                'shape': 'rectangle',
                'content': card_content
            },
            'style': {
                'fillColor': '#e0f2ff',
                'borderColor': '#4169e1',
                'borderWidth': '2',
                'textAlign': 'center',
                'textAlignVertical': 'middle'
            },
            'geometry': {
                'width': width,
                'height': height
            },
            'position': {
                'x': x,
                'y': y,
                'origin': 'center'
            }
        }

        try:
            result = self._make_request('POST', 'shapes', card_data)
            print(f'✓ タスクカード作成: {content}')
            return result
        except Exception as e:
            print(f'✗ タスクカード作成失敗: {content} - {e}')
            raise

    def create_decision_node(self, content: str, x: int, y: int,
                           width: int, height: int) -> Dict:
        """判断分岐を作成"""
        shape_data = {
            'data': {
                'shape': 'rhombus',
                'content': f'<p style="font-size: 12px; margin: 2px 0;"><strong>{content}</strong></p>'
            },
            'style': {
                'fillColor': '#fffacd',
                'borderColor': '#ffd700',
                'borderWidth': '2',
                'textAlign': 'center',
                'textAlignVertical': 'middle'
            },
            'geometry': {
                'width': width,
                'height': height
            },
            'position': {
                'x': x,
                'y': y,
                'origin': 'center'
            }
        }

        try:
            result = self._make_request('POST', 'shapes', shape_data)
            print(f'✓ 判断ノード作成: {content}')
            return result
        except Exception as e:
            print(f'✗ 判断ノード作成失敗: {content} - {e}')
            raise

    def create_document_icon(self, name: str, x: int, y: int) -> Dict:
        """ドキュメントアイコンを作成（shapesを使用）"""
        card_data = {
            'data': {
                'shape': 'rectangle',
                'content': f'<p style="font-size: 16px; margin: 0;">📄</p><p style="font-size: 10px; margin: 2px 0;">{name}</p>'
            },
            'style': {
                'fillColor': '#d5f5d5',
                'borderColor': '#4caf50',
                'borderWidth': '2',
                'textAlign': 'center',
                'textAlignVertical': 'middle'
            },
            'geometry': {
                'width': 140,
                'height': 70
            },
            'position': {
                'x': x,
                'y': y,
                'origin': 'center'
            }
        }

        try:
            result = self._make_request('POST', 'shapes', card_data)
            print(f'✓ ドキュメント作成: {name}')
            return result
        except Exception as e:
            print(f'✗ ドキュメント作成失敗: {name} - {e}')
            raise

    def create_system_icon(self, name: str, x: int, y: int) -> Dict:
        """システムアイコンを作成（shapesを使用）"""
        card_data = {
            'data': {
                'shape': 'rectangle',
                'content': f'<p style="font-size: 16px; margin: 0;">💻</p><p style="font-size: 10px; margin: 2px 0;">{name}</p>'
            },
            'style': {
                'fillColor': '#e8d9ff',
                'borderColor': '#9c27b0',
                'borderWidth': '2',
                'textAlign': 'center',
                'textAlignVertical': 'middle'
            },
            'geometry': {
                'width': 140,
                'height': 70
            },
            'position': {
                'x': x,
                'y': y,
                'origin': 'center'
            }
        }

        try:
            result = self._make_request('POST', 'shapes', card_data)
            print(f'✓ システム作成: {name}')
            return result
        except Exception as e:
            print(f'✗ システム作成失敗: {name} - {e}')
            raise

    @staticmethod
    def is_backward_label(label: str) -> bool:
        """差し戻し系のラベルかどうか判定"""
        backward_keywords = ['差し戻し', '不可', '不合格', '却下']
        return any(kw in label for kw in backward_keywords)

    @staticmethod
    def determine_snap(from_info: Dict, to_info: Dict, is_backward: bool, sibling_index: int = 0) -> tuple:
        """コネクタの接続位置を決定
        sibling_index: 同一ノードから出る何本目のフォワードコネクタか（0始まり）
        """
        if is_backward:
            # 差し戻し: 左側から出て左側に入る（カーブで迂回）
            return 'left', 'left'
        elif from_info.get('swimlane') == to_info.get('swimlane'):
            # 同一スイムレーン: 2本目はbottom→leftで迂回
            if sibling_index > 0:
                return 'bottom', 'left'
            return 'right', 'left'
        elif from_info.get('y', 0) < to_info.get('y', 0):
            # 下方向へ: 下→上
            return 'bottom', 'top'
        else:
            # 上方向へ: 上→下
            return 'top', 'bottom'

    def create_connector(self, from_id: str, to_id: str, label: str = '',
                         is_backward: bool = False,
                         snap_from: str = 'auto', snap_to_pos: str = 'auto',
                         caption_position: str = '50%') -> Dict:
        """コネクタ（矢印）を作成
        caption_position: ラベル表示位置（"30%"/"50%"/"70%"）
        """
        connector_data = {
            'startItem': {
                'id': from_id,
                'snapTo': snap_from
            },
            'endItem': {
                'id': to_id,
                'snapTo': snap_to_pos
            },
            'shape': 'curved' if is_backward else 'elbowed',
            'style': {
                'strokeColor': '#e74c3c' if is_backward else '#4169e1',
                'strokeWidth': '2',
                'strokeStyle': 'dashed' if is_backward else 'normal',
                'textOrientation': 'horizontal'
            }
        }

        if label:
            connector_data['captions'] = [
                {
                    'content': label,
                    'position': caption_position
                }
            ]

        try:
            result = self._make_request('POST', 'connectors', connector_data)
            arrow_type = '↩ 差戻し' if is_backward else '→'
            print(f'✓ コネクタ作成: {from_id} {arrow_type} {to_id}')
            return result
        except Exception as e:
            print(f'✗ コネクタ作成失敗: {from_id} → {to_id} - {e}')
            raise

    def import_from_json(self, json_file: str):
        """JSONファイルから業務フローをインポート"""
        print('\n🚀 Miroへのエクスポート開始...\n')

        with open(json_file, 'r', encoding='utf-8') as f:
            flow_data = json.load(f)

        item_ids = {}  # 作成したアイテムのIDを保存

        # レイアウト設定をJSONから読み取り（デフォルト: 6200x3100）
        layout = flow_data.get('layout', {})
        sw_width = layout.get('swimlane_width', 6200)
        sw_center_x = layout.get('swimlane_center_x', 3100)

        # 1. スイムレーンを作成
        print('📋 スイムレーン作成中...')
        for swimlane in flow_data.get('swimlanes', []):
            sw_height = swimlane.get('height', 350)
            y_pos = swimlane.get('y_position', 0)
            frame = self.create_swimlane(
                swimlane['name'],
                sw_center_x,
                y_pos + sw_height // 2,
                sw_width,
                sw_height
            )
            item_ids[f"swimlane_{swimlane['name']}"] = frame['id']
            time.sleep(0.2)  # レート制限対策

        # 2. タスクカードを作成
        print('\n📝 タスクカード作成中...')
        for swimlane in flow_data.get('swimlanes', []):
            for card in swimlane.get('cards', []):
                if card.get('type') == 'decision':
                    item = self.create_decision_node(
                        card['content'],
                        card['x'],
                        card['y'],
                        card['width'],
                        card['height']
                    )
                else:
                    item = self.create_task_card(
                        card['content'],
                        card['x'],
                        card['y'],
                        card['width'],
                        card['height'],
                        card.get('metadata')
                    )
                item_ids[card['id']] = item['id']
                time.sleep(0.2)

        # 3. ドキュメントアイコンを作成
        if flow_data.get('documents'):
            print('\n📄 ドキュメント作成中...')
            for doc in flow_data['documents']:
                item = self.create_document_icon(
                    doc['name'],
                    doc['x'],
                    doc['y']
                )
                item_ids[f"doc_{doc['name']}"] = item['id']
                time.sleep(0.2)

        # 4. システムアイコンを作成
        if flow_data.get('systems'):
            print('\n💻 システム作成中...')
            for system in flow_data['systems']:
                item = self.create_system_icon(
                    system['name'],
                    system['x'],
                    system['y']
                )
                item_ids[f"sys_{system['name']}"] = item['id']
                time.sleep(0.2)

        # 5. コネクタを作成
        if flow_data.get('connectors'):
            print('\n🔗 コネクタ作成中...')

            # カード位置情報を収集（コネクタのルーティングに使用）
            card_info = {}
            for swimlane in flow_data.get('swimlanes', []):
                for card in swimlane.get('cards', []):
                    card_info[card['id']] = {
                        'x': card['x'],
                        'y': card['y'],
                        'swimlane': swimlane['name'],
                        'type': card.get('type', 'task')
                    }

            # 同一ノードからのフォワードコネクタ数を事前集計（ラベル位置分散用）
            forward_out_count = {}
            forward_out_index = {}
            for connector in flow_data['connectors']:
                label = connector.get('label', '')
                if not self.is_backward_label(label):
                    forward_out_count[connector['from']] = forward_out_count.get(connector['from'], 0) + 1

            # キャプション位置の分散パターン
            caption_positions = ['40%', '60%', '50%']

            for connector in flow_data['connectors']:
                from_id = item_ids.get(connector['from'])
                to_id = item_ids.get(connector['to'])

                if from_id and to_id:
                    label = connector.get('label', '')
                    is_backward = self.is_backward_label(label)

                    from_info = card_info.get(connector['from'], {})
                    to_info = card_info.get(connector['to'], {})

                    # フォワードコネクタのインデックスを取得
                    sibling_index = 0
                    if not is_backward:
                        forward_out_index.setdefault(connector['from'], 0)
                        sibling_index = forward_out_index[connector['from']]
                        forward_out_index[connector['from']] += 1

                    snap_from, snap_to_pos = self.determine_snap(
                        from_info, to_info, is_backward, sibling_index
                    )

                    # キャプション位置: 同一ノードから複数出る場合は分散
                    caption_pos = '50%'
                    if not is_backward and label and forward_out_count.get(connector['from'], 0) > 1:
                        caption_pos = caption_positions[sibling_index % len(caption_positions)]
                    elif is_backward and label:
                        caption_pos = '40%'  # 差し戻しラベルはカーブの前半に寄せる

                    self.create_connector(
                        from_id, to_id, label,
                        is_backward, snap_from, snap_to_pos, caption_pos
                    )
                    time.sleep(0.2)
                else:
                    print(f"⚠️ コネクタのID解決失敗: {connector['from']} → {connector['to']}")

        # 6. シェイプを前面に出す（コネクタの上にシェイプを表示するため）
        print('\n🔝 シェイプを前面に移動中...')
        for swimlane in flow_data.get('swimlanes', []):
            for card in swimlane.get('cards', []):
                miro_id = item_ids.get(card['id'])
                if miro_id:
                    self.bring_shape_to_front(miro_id, card['x'], card['y'])
                    time.sleep(0.1)
        for doc in flow_data.get('documents', []):
            miro_id = item_ids.get(f"doc_{doc['name']}")
            if miro_id:
                self.bring_shape_to_front(miro_id, doc['x'], doc['y'])
                time.sleep(0.1)
        for system in flow_data.get('systems', []):
            miro_id = item_ids.get(f"sys_{system['name']}")
            if miro_id:
                self.bring_shape_to_front(miro_id, system['x'], system['y'])
                time.sleep(0.1)

        print('\n✅ エクスポート完了！\n')
        print(f'🔗 Miroボード: https://miro.com/app/board/{self.board_id}/')


def main():
    """メイン実行"""
    import sys

    if len(sys.argv) < 2:
        print("""
使用方法:
  python miro_exporter.py <json-file>

例:
  python miro_exporter.py output.json

環境変数:
  MIRO_ACCESS_TOKEN - Miroアクセストークン
  MIRO_BOARD_ID - 出力先ボードID
        """)
        sys.exit(1)

    json_file = sys.argv[1]

    if not os.path.exists(json_file):
        print(f'❌ ファイルが見つかりません: {json_file}')
        sys.exit(1)

    try:
        exporter = MiroExporter()
        exporter.import_from_json(json_file)
    except Exception as e:
        print(f'❌ エラー: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
