# Business Flow Generator

業務ヒアリング議事録から業務フロー図を自動生成し、Miroボードにエクスポートするツールです。

Claude CodeのSkill（`skill.md`）として動作し、議事録の分析からMiro出力までを一貫して行います。

## 構成

```
business-flow-generator/
├── skill.md              # Claude Code Skill定義（8品質ポイント準拠）
├── miro-exporter.js      # Miroエクスポーター（Node.js）
├── miro_exporter.py      # Miroエクスポーター（Python）
├── flow-validator.js     # 品質検証ツール（7項目チェック）
├── .env.example          # 環境変数テンプレート
├── package.json          # Node.js依存パッケージ
└── requirements.txt      # Python依存パッケージ
```

## セットアップ

### 1. Miro API設定

[Miro Developer Portal](https://developers.miro.com/) でアプリを作成し、アクセストークンを取得します。

```bash
cp .env.example .env
```

`.env` にトークンとボードIDを設定：

```
MIRO_ACCESS_TOKEN=your_token_here
MIRO_BOARD_ID=your_board_id_here
```

### 2. 依存パッケージのインストール

```bash
# Node.js版
npm install

# Python版
pip install -r requirements.txt
```

## 使い方

### ステップ1: 議事録からJSONを生成

Claude Codeで `skill.md` を読み込み、議事録を分析してMiro用JSONを生成します。

```
この議事録から業務フローを生成してください: [議事録ファイルパス]
```

### ステップ2: 品質検証

```bash
node flow-validator.js output.json
```

8つの品質ポイントに基づく7項目の検証を実施：

- 座標計算ルール（50pxグリッド整列）
- 接続点の重複禁止
- 差戻し構造配置
- タイムライン位置関係
- システム色分け
- 実行順序明確化
- レイヤー構造管理

### ステップ3: Miroにエクスポート

```bash
# Node.js版
node miro-exporter.js output.json

# Python版
python miro_exporter.py output.json
```

## 出力仕様

### スイムレーン形式
- 部門ごとのフレームで横方向に業務フローを表現
- タスクカード（青）、判断ノード（黄/ひし形）
- ドキュメントアイコン（緑）、システムアイコン（紫）

### コネクタ
- 通常フロー: 青実線（elbowed）
- 差し戻し: 赤点線（curved）
- キーワード自動判定: 差し戻し / 不可 / 不合格 / 却下

### z-order管理
- コネクタ作成後に全シェイプをPATCHして前面に移動
- 矢印がカードの背面に表示される

## Skill定義（skill.md）

`skill.md` にはClaude Codeが議事録を分析してMiro用JSONを生成するための全ルールが定義されています：

- 議事録分析の手順（Phase 1-4）
- 8つの品質ポイントの詳細
- Miro出力用JSON仕様
- Miro API制約と注意事項
- よくある間違い12パターン

## ライセンス

MIT
