# よくある間違いと対策

品質検証でエラーが出た場合、またはMiroエクスポートで問題が発生した場合に参照してください。

---

## JSON生成時の間違い（Claudeが注意すべき）

### 間違い1: アイコンをカードの上下に配置
```
NG: card(x=3350, y=2150), icon(x=3350, y=2050)  ← コネクタと重なる
OK: card(x=3350, y=2150), icon(x=4100, y=2150)  ← 同じY、別のX
```

### 間違い9: 同一ペアへの重複コネクタ
```
NG: {"from":"card_2","to":"card_3","label":"条件A"}
    {"from":"card_2","to":"card_3","label":"条件B"}  ← 完全に重なって読めない

OK: {"from":"card_2","to":"card_3","label":"条件A / 条件B"}  ← 1本に統合
```

---

## エクスポーターが自動処理する間違い（JSON側での対応は不要）

### 間違い2: sticky_notesの使用
```
NG: POST /v2/boards/{id}/sticky_notes  ← 色の指定に制限あり
OK: POST /v2/boards/{id}/shapes       ← すべてshapesで統一
```

### 間違い3: カラーコード名の使用
```
NG: fillColor: 'light_blue'  ← API Error
OK: fillColor: '#e0f2ff'     ← hex形式のみ
```

### 間違い4: connectorのデータ構造
```
NG: { data: { startItem: {id: '...'} } }  ← startItemはdata内ではない
OK: { startItem: {id: '...'} }            ← トップレベル
```

### 間違い5: captionのposition型
```
NG: position: 0.5      ← 数値はエラー
OK: position: "50%"    ← 文字列で指定
```

### 間違い6: borderWidthの型
```
NG: borderWidth: 2     ← 数値はエラーになることがある
OK: borderWidth: '2'   ← 文字列で指定
```

### 間違い7: フレームのfillColor
```
NG: frames + style.fillColor  ← フレームはfillColor非対応
OK: frames + style なし       ← スタイル指定しない
```

### 間違い8: z-orderの考慮漏れ
```
NG: シェイプ作成 → コネクタ作成 → そのまま  ← 線がダイアグラムの箱の上に表示される
OK: シェイプ作成 → コネクタ作成 → 全シェイプPATCH  ← 箱が前面、線が背面になる
```

### 間違い10: 判断ノードからの分岐が同じ方向
```
NG: 判断ノード → 正常(right→left) + 別条件(right→left)  ← 線が重なる
OK: 判断ノード → 正常(right→left) + 別条件(bottom→left)  ← 方向が分散
```

### 間違い11: コネクタラベルの位置固定
```
NG: 全コネクタのcaption position = "50%"  ← 同一ノードから複数出ると重なる
OK: 1本目="40%", 2本目="60%", 差し戻し="40%"  ← エクスポーターが自動分散
```

### 間違い12: コネクタラベルの縦書き表示
```
NG: style: { strokeColor, strokeWidth, strokeStyle }  ← textOrientation未指定
OK: style: { ..., textOrientation: 'horizontal' }     ← エクスポーターが自動設定
```
