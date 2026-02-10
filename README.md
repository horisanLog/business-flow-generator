# Business Flow Generator

**あらゆる業務情報**から業務フロー図を自動生成し、Miroボードにエクスポートするツールです。

Claude CodeのSkillとして動作し、**自然言語の指示だけ**で業務情報の分析からMiro出力までを一貫して行います。コマンドを覚える必要はありません。

## 使い方

### 基本：指示するだけ

Claude Codeでこのプロジェクトを開き、自然言語で指示するだけです。

```
この議事録から業務フローを作成して、Miroに出力してください
```

Claude Codeが自動的に以下を実行します：

1. 入力情報を分析し、アクター・プロセス・ドキュメント・システムを抽出
2. 8品質ポイントに準拠したMiro用JSONを生成
3. `flow-validator.js` で品質検証（7/7合格を確認）
4. `miro-exporter.js` でMiroボードにエクスポート

### 対応する入力形式

議事録に限らず、業務プロセスが読み取れるあらゆる情報を入力として使えます。

| 入力形式 | 説明 |
|---------|------|
| ヒアリング議事録 | 業務担当者へのヒアリング内容をまとめたもの |
| 業務マニュアル・手順書 | 既存の業務手順を記述したドキュメント |
| テキスト説明 | 業務の流れを自由記述したもの |
| 箇条書きメモ | ステップを箇条書きでまとめたもの |
| 既存フロー図の文字起こし | 既存の図を言語化した内容 |

### 指示の例

```
# ファイルを指定して生成
この議事録から業務フローを生成してMiroに出力して: meeting-notes.md

# 業務手順書からフローを生成
この業務マニュアルから業務フローを作成してMiroに出力して: manual.md

# テキストを直接貼り付けて生成
以下の内容から業務フローを作成してMiroに出力してください:
1. 営業が見積書を作成
2. 上長が承認
3. 経理が請求書を発行
...

# 検証だけ実行
output.json の品質を検証して

# Miroエクスポートだけ実行
output.json をMiroにエクスポートして
```

すべて自然言語で指示するだけで、Claude Codeが適切なツールを選択して実行します。

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/horisanLog/business-flow-generator.git
cd business-flow-generator
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. Miro API設定

[Miro Developer Portal](https://developers.miro.com/) でアプリを作成し、アクセストークンを取得します。

```bash
cp .env.example .env
```

`.env` にトークンとボードIDを設定：

```
MIRO_ACCESS_TOKEN=your_token_here
MIRO_BOARD_ID=your_board_id_here
```

### 4. Claude Codeで開く

```bash
claude
```

あとは自然言語で指示するだけです。

## 構成

```
business-flow-generator/
├── .claude/skills/business-flow-generator/
│   └── SKILL.md          # Claude Code Skill定義（8品質ポイント準拠）
├── miro-exporter.js      # Miroエクスポーター（Node.js）
├── miro_exporter.py      # Miroエクスポーター（Python）
├── flow-validator.js     # 品質検証ツール（7項目チェック）
├── .env.example          # 環境変数テンプレート
├── package.json          # Node.js依存パッケージ
└── requirements.txt      # Python依存パッケージ
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

### 品質保証
- 8つの品質ポイントに完全準拠したJSON生成
- `flow-validator.js` による7項目の自動検証
- コネクタ作成後の全シェイプPATCHによるz-order管理

## Skill定義

`.claude/skills/business-flow-generator/SKILL.md` にClaude Codeが業務情報を分析してMiro用JSONを生成するための全ルールが定義されています：

- 議事録分析の手順（Phase 1-4）
- 8つの品質ポイントの詳細
- Miro出力用JSON仕様
- Miro API制約と注意事項
- よくある間違い12パターン

## ライセンス

MIT
