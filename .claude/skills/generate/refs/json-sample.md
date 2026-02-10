# JSON出力サンプル

新しいフローを生成する際のリファレンスとして使用してください。

---

## 「新商品開発プロセス」の出力例（抜粋）

```json
{
  "業務名": "新商品開発プロセス",
  "layout": {
    "swimlane_width": 6200,
    "swimlane_center_x": 3100
  },
  "swimlanes": [
    {
      "name": "営業部",
      "y_position": 0,
      "height": 300,
      "cards": [
        {
          "id": "card_1",
          "type": "task",
          "title": "顧客要望収集",
          "x": 200,
          "y": 150,
          "width": 220,
          "height": 120,
          "metadata": { "duration": "月次集計", "documents": [], "systems": [] }
        },
        {
          "id": "card_2",
          "type": "task",
          "title": "企画部へ提出",
          "x": 550,
          "y": 150,
          "width": 220,
          "height": 120,
          "metadata": { "duration": "月初", "documents": [], "systems": [] }
        }
      ]
    },
    {
      "name": "企画部",
      "y_position": 400,
      "height": 300,
      "cards": [
        {
          "id": "card_3",
          "type": "task",
          "title": "企画書作成",
          "x": 900,
          "y": 550,
          "width": 220,
          "height": 120,
          "metadata": { "duration": "2週間", "documents": [], "systems": [] }
        }
      ]
    }
  ],
  "connectors": [
    {"from": "card_1", "to": "card_2", "label": "月次"},
    {"from": "card_2", "to": "card_3", "label": ""},
    {"from": "card_5", "to": "card_3", "label": "差し戻し"}
  ],
  "documents": [
    {"name": "顧客要望管理.xlsx", "x": 850, "y": 150}
  ],
  "systems": [
    {"name": "Excel", "x": 1050, "y": 150}
  ]
}
```

**注意: 上記は抜粋です。実際の出力では全スイムレーン・全カード・全コネクタ・全アイコンを含めること。**
