# Business Flow Generator

業務情報（議事録、手順書、メモ等）から高品質な業務フロー図を自動生成し、Miroボードにエクスポートするプロジェクト。

## プロジェクト構造

| ファイル | 役割 |
|---------|------|
| `flow-validator.js` | 品質検証ツール（7項目チェック） |
| `miro-exporter.js` | Miroエクスポーター（Node.js版） |
| `miro_exporter.py` | Miroエクスポーター（Python版） |

## ツール実行コマンド

```bash
# 品質検証（7/7パスが必須）
node flow-validator.js <output.json>

# Miroエクスポート
node miro-exporter.js <output.json>
```

## 環境設定

`.env` に以下を設定:
```
MIRO_ACCESS_TOKEN=your_token_here
MIRO_BOARD_ID=your_board_id_here
```

## コーディング規約

- コメント・ドキュメントは日本語で記述
- 色は必ずhex形式（`#4169e1`）を使用。カラー名（`royal_blue`）は不可

## エクスポーターの自動処理

以下はエクスポーターが自動処理するため、JSON生成時に意識する必要はない:
- コネクタのsnapTo方向（接続元/接続先の位置関係から自動決定）
- 差し戻しコネクタのスタイル（label内のキーワードで自動判定）
- キャプション位置の分散（同一ノードから複数出る場合の40%/60%配分）
- z-order管理（全シェイプのPATCH処理）
- textOrientation: 'horizontal'（コネクタラベルの水平表示）

JSON生成者が意識すべきは「正しい構造・座標・from/to/label」のみ。
