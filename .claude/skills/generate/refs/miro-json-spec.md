# Miro出力用JSON仕様（詳細リファレンス）

JSON生成時に仕様の詳細確認が必要な場合に参照してください。

---

## layout オブジェクト

```json
{
  "swimlane_width": 6200,
  "swimlane_center_x": 3100
}
```

- `swimlane_width`: スイムレーン（フレーム）の幅。全カードのX座標範囲＋余白が収まるサイズ
- `swimlane_center_x`: スイムレーンの中心X座標。`swimlane_width / 2`
- カード数やフロー複雑度に応じて幅を調整する（目安: カード10個以下=3000px、15個以上=6000px+）

## swimlanes 配列

```json
{
  "name": "部署名",
  "y_position": 0,
  "height": 300,
  "cards": [...]
}
```

**スイムレーン配置ルール:**

```
スイムレーンサイズ:
  - height: 300px（標準。カード高さ120px + 上下余白90px）
  - gap: スイムレーン間は100px空ける

配置例（6スイムレーン）:
  営業部:    y_position=0,    height=300
  企画部:    y_position=400,  height=300
  経営層:    y_position=800,  height=300
  総務部:    y_position=1200, height=300
  開発部:    y_position=1600, height=300
  品質管理部: y_position=2000, height=300
```

- フレームのAPI呼び出し時のY座標 = `y_position + height / 2`（中心座標）
- フレームには `fillColor` を設定しない（Miro APIがフレームのfillColorを拒否する）

## cards 配列

```json
{
  "id": "card_1",
  "type": "task",
  "content": "タスク名",
  "x": 200,
  "y": 150,
  "width": 220,
  "height": 120,
  "metadata": {
    "duration": "2週間",
    "documents": [],
    "systems": []
  }
}
```

**カードタイプ別サイズ:**

| type | shape | width | height |
|------|-------|-------|--------|
| task | rectangle | 220 | 120 |
| decision | rhombus | 200 | 130 |

**カードのY座標はスイムレーンの中心に配置:**
```
card.y = swimlane.y_position + swimlane.height / 2
例: 営業部(y_position=0, height=300) → card.y = 150
例: 企画部(y_position=400, height=300) → card.y = 550
```

## connectors 配列

```json
{
  "from": "card_1",
  "to": "card_2",
  "label": "承認"
}
```

- `from`/`to`: cards内のidを参照
- `label`: 空文字の場合はcaptionsを付けない
- 差し戻し判定は `label` の内容で自動判定（差し戻し/不可/不合格/却下）

**コネクタ重なり回避の必須ルール:**

> **同一from→toペアのコネクタは1本のみ。** 同じ2ノード間に複数条件がある場合はラベルを結合する。

```
NG: {"from":"card_2","to":"card_3","label":"重大A"}
    {"from":"card_2","to":"card_3","label":"通常B/C"}  ← 2本が完全に重なる

OK: {"from":"card_2","to":"card_3","label":"重大A / 通常B・C"}  ← 1本に統合
```

> **判断ノードからの分岐は異なる方向に出す。**

```
判断ノードからの出力パターン:
  - 正常フロー（1本目）: right → left（同レーン）/ bottom → top（下降）
  - 正常フロー（2本目）: bottom → left（迂回して分離）
  - 差し戻し: left → left（カーブで大きく迂回、赤点線）
```

## documents / systems 配列

```json
{
  "name": "顧客要望管理.xlsx",
  "x": 850,
  "y": 150
}
```

**アイコン配置の最重要ルール:**

> **アイコンはカードと同じY座標に、カードが存在しないX位置に配置する。**
> アイコンをカードの上下に配置すると、スイムレーン間を横断するコネクタとアイコンが重なる。

```
正しい配置例:
  営業部 (y=150):
    card_1 (x=200), card_2 (x=550), doc_icon (x=850), sys_icon (x=1050)
    → アイコンはカードの右側の空きX位置に配置
```

**アイコンサイズ:**
- ドキュメント: 140 x 70
- システム: 140 x 70
