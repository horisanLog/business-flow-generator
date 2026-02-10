# Miro API制約とエクスポーター仕様

通常のJSON生成時には参照不要です。エクスポートでエラーが発生した場合に確認してください。

---

## 使用するAPIエンドポイント

| 要素 | エンドポイント | メソッド |
|------|---------------|---------|
| フレーム（スイムレーン） | `/v2/boards/{boardId}/frames` | POST |
| シェイプ（全要素） | `/v2/boards/{boardId}/shapes` | POST |
| コネクタ（矢印） | `/v2/boards/{boardId}/connectors` | POST |
| z-order更新 | `/v2/boards/{boardId}/shapes/{shapeId}` | PATCH |

## 絶対に守るべきAPI制約

1. **sticky_notesを使わない** - すべてshapesで作成する（sticky_notesはカラーコード制限がある）
2. **フレームにfillColorを設定しない** - API Error 400になる
3. **色は必ずhex形式** - `'#4169e1'` OK / `'royal_blue'` NG
4. **コネクタのstartItem/endItemはトップレベル** - `data`の中に入れるとエラー
5. **captionsのpositionは文字列** - `"50%"` OK / `0.5` NG
6. **positionにoriginを付ける** - `{ x, y, origin: 'center' }`
7. **borderWidthは文字列** - `'2'` OK / `2` NG
8. **APIレート制限** - 各リクエスト間に200ms以上の間隔を空ける
9. **textOrientationは必ず"horizontal"** - コネクタのstyleに`textOrientation: "horizontal"`を設定する。デフォルト`"aligned"`だと垂直コネクタでラベルが縦書きになり読めない

## コネクタのsnapTo設定（エクスポーターが自動処理）

接続元・接続先の位置関係に基づいて最適な接続ポイントを決定:

```
判定ロジック（siblingIndex = 同一ノードからの何本目のフォワードコネクタか）:
  if 差し戻し:
    snapFrom='left', snapTo='left'  （カーブで迂回するため両方左）
  else if 同一スイムレーン:
    if siblingIndex == 0:
      snapFrom='right', snapTo='left'  （右から出て左に入る＝水平フロー）
    else:
      snapFrom='bottom', snapTo='left'  （下から出て左に入る＝2本目は迂回）
  else if from.y < to.y:
    snapFrom='bottom', snapTo='top'  （下方向へ＝スイムレーン横断下降）
  else:
    snapFrom='top', snapTo='bottom'  （上方向へ＝スイムレーン横断上昇）
```

## z-order管理（エクスポーターが自動処理）

Miroでは要素の前後関係は「作成順序」で決まる（後から作成されたものが前面）。

**解決手順:**
1. フレーム作成（最背面）
2. シェイプ作成（カード、アイコン）
3. コネクタ作成（この時点ではコネクタがシェイプの上に来る）
4. **全シェイプ＋全アイコンをPATCHで位置再更新**（z-orderが前面に移動）

## エクスポート実行順序（エクスポーターが自動処理）

```
1. スイムレーン（フレーム）作成  → 各200ms間隔
2. タスクカード・判断ノード作成   → 各200ms間隔
3. ドキュメントアイコン作成      → 各200ms間隔
4. システムアイコン作成          → 各200ms間隔
5. コネクタ作成                 → 各200ms間隔（ラベル位置自動分散）
6. 全シェイプを前面に移動（PATCH）→ 各100ms間隔
```
