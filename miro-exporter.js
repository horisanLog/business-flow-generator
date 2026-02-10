#!/usr/bin/env node

/**
 * Miro Business Flow Exporter
 * 生成された業務フローをMiroボードに出力する
 */

const https = require('https');
const fs = require('fs');
require('dotenv').config();

class MiroExporter {
  constructor(accessToken, boardId) {
    this.accessToken = accessToken || process.env.MIRO_ACCESS_TOKEN;
    this.boardId = boardId || process.env.MIRO_BOARD_ID;
    this.baseUrl = 'api.miro.com';

    if (!this.accessToken) {
      throw new Error('Miro access token が設定されていません');
    }
    if (!this.boardId) {
      throw new Error('Miro board ID が設定されていません');
    }
  }

  /**
   * Miro APIにリクエストを送信
   */
  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve(body);
            }
          } else {
            reject(new Error(`API Error: ${res.statusCode} - ${body}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * スイムレーンを作成（フレームで代用）
   */
  async createSwimlane(name, x, y, width, height) {
    const frameData = {
      data: {
        title: name,
        type: 'freeform',
        format: 'custom'
      },
      geometry: {
        width: width,
        height: height
      },
      position: {
        x: x,
        y: y,
        origin: 'center'
      }
    };

    try {
      const result = await this.makeRequest(
        'POST',
        `/v2/boards/${this.boardId}/frames`,
        frameData
      );
      console.log(`✓ スイムレーン作成: ${name}`);
      return result;
    } catch (error) {
      console.error(`✗ スイムレーン作成失敗: ${name}`, error.message);
      throw error;
    }
  }

  /**
   * タスクカードを作成
   */
  async createTaskCard(content, x, y, width, height, metadata = {}) {
    const cardData = {
      data: {
        shape: 'rectangle',
        content: `<p style="font-size: 13px; margin: 2px 0;"><strong>${content}</strong></p>
                  ${metadata.duration ? `<p style="font-size: 10px; margin: 2px 0;">⏱️ ${metadata.duration}</p>` : ''}
                  ${metadata.documents ? `<p style="font-size: 9px; margin: 2px 0;">📄 ${metadata.documents.join(', ')}</p>` : ''}
                  ${metadata.systems ? `<p style="font-size: 9px; margin: 2px 0;">💻 ${metadata.systems.join(', ')}</p>` : ''}`
      },
      style: {
        fillColor: '#e0f2ff',
        borderColor: '#4169e1',
        borderWidth: '2',
        textAlign: 'center',
        textAlignVertical: 'middle'
      },
      geometry: {
        width: width,
        height: height
      },
      position: {
        x: x,
        y: y,
        origin: 'center'
      }
    };

    try {
      const result = await this.makeRequest(
        'POST',
        `/v2/boards/${this.boardId}/shapes`,
        cardData
      );
      console.log(`✓ タスクカード作成: ${content}`);
      return result;
    } catch (error) {
      console.error(`✗ タスクカード作成失敗: ${content}`, error.message);
      throw error;
    }
  }

  /**
   * 判断分岐を作成
   */
  async createDecisionNode(content, x, y, width, height) {
    const shapeData = {
      data: {
        shape: 'rhombus',
        content: `<p style="font-size: 12px; margin: 2px 0;"><strong>${content}</strong></p>`
      },
      style: {
        fillColor: '#fffacd',
        borderColor: '#ffd700',
        borderWidth: '2',
        textAlign: 'center',
        textAlignVertical: 'middle'
      },
      geometry: {
        width: width,
        height: height
      },
      position: {
        x: x,
        y: y,
        origin: 'center'
      }
    };

    try {
      const result = await this.makeRequest(
        'POST',
        `/v2/boards/${this.boardId}/shapes`,
        shapeData
      );
      console.log(`✓ 判断ノード作成: ${content}`);
      return result;
    } catch (error) {
      console.error(`✗ 判断ノード作成失敗: ${content}`, error.message);
      throw error;
    }
  }

  /**
   * ドキュメントアイコンを作成（shapesを使用）
   */
  async createDocumentIcon(name, x, y) {
    const cardData = {
      data: {
        shape: 'rectangle',
        content: `<p style="font-size: 16px; margin: 0;">📄</p><p style="font-size: 10px; margin: 2px 0;">${name}</p>`
      },
      style: {
        fillColor: '#d5f5d5',
        borderColor: '#4caf50',
        borderWidth: '2',
        textAlign: 'center',
        textAlignVertical: 'middle'
      },
      geometry: {
        width: 140,
        height: 70
      },
      position: {
        x: x,
        y: y,
        origin: 'center'
      }
    };

    try {
      const result = await this.makeRequest(
        'POST',
        `/v2/boards/${this.boardId}/shapes`,
        cardData
      );
      console.log(`✓ ドキュメント作成: ${name}`);
      return result;
    } catch (error) {
      console.error(`✗ ドキュメント作成失敗: ${name}`, error.message);
      throw error;
    }
  }

  /**
   * システムアイコンを作成（shapesを使用）
   */
  async createSystemIcon(name, x, y) {
    const cardData = {
      data: {
        shape: 'rectangle',
        content: `<p style="font-size: 16px; margin: 0;">💻</p><p style="font-size: 10px; margin: 2px 0;">${name}</p>`
      },
      style: {
        fillColor: '#e8d9ff',
        borderColor: '#9c27b0',
        borderWidth: '2',
        textAlign: 'center',
        textAlignVertical: 'middle'
      },
      geometry: {
        width: 140,
        height: 70
      },
      position: {
        x: x,
        y: y,
        origin: 'center'
      }
    };

    try {
      const result = await this.makeRequest(
        'POST',
        `/v2/boards/${this.boardId}/shapes`,
        cardData
      );
      console.log(`✓ システム作成: ${name}`);
      return result;
    } catch (error) {
      console.error(`✗ システム作成失敗: ${name}`, error.message);
      throw error;
    }
  }

  /**
   * 差し戻し系のラベルかどうか判定
   */
  isBackwardLabel(label) {
    const backwardKeywords = ['差し戻し', '不可', '不合格', '却下'];
    return backwardKeywords.some(kw => label.includes(kw));
  }

  /**
   * コネクタの接続位置を決定
   * siblingIndex: 同一ノードから出る何本目のフォワードコネクタか（0始まり）
   */
  determineSnap(fromInfo, toInfo, isBackward, siblingIndex = 0) {
    if (isBackward) {
      return { snapFrom: 'bottom', snapTo: 'bottom' };
    }

    // 同一ノードから複数のフォワードコネクタがある場合、snapToを分散
    if (fromInfo.swimlane === toInfo.swimlane) {
      // 同一スイムレーン: 2本目はbottom→leftで迂回
      if (siblingIndex > 0) {
        return { snapFrom: 'bottom', snapTo: 'left' };
      }
      return { snapFrom: 'right', snapTo: 'left' };
    } else if (fromInfo.y < toInfo.y) {
      return { snapFrom: 'bottom', snapTo: 'top' };
    } else {
      return { snapFrom: 'top', snapTo: 'bottom' };
    }
  }

  /**
   * コネクタ（矢印）を作成
   * captionPosition: ラベル表示位置（"30%"/"50%"/"70%"）
   */
  async createConnector(fromId, toId, label = '', isBackward = false, snapFrom = 'auto', snapToPos = 'auto', captionPosition = '50%') {
    const connectorData = {
      startItem: {
        id: fromId,
        snapTo: snapFrom
      },
      endItem: {
        id: toId,
        snapTo: snapToPos
      },
      shape: isBackward ? 'curved' : 'elbowed',
      style: {
        strokeColor: isBackward ? '#e74c3c' : '#4169e1',
        strokeWidth: '2',
        strokeStyle: isBackward ? 'dashed' : 'normal',
        textOrientation: 'horizontal'
      }
    };

    // ラベルがある場合のみcaptionsを追加
    if (label) {
      connectorData.captions = [
        {
          content: label,
          position: captionPosition
        }
      ];
    }

    try {
      const result = await this.makeRequest(
        'POST',
        `/v2/boards/${this.boardId}/connectors`,
        connectorData
      );
      const arrowType = isBackward ? '↩ 差戻し' : '→';
      console.log(`✓ コネクタ作成: ${fromId} ${arrowType} ${toId}`);
      return result;
    } catch (error) {
      console.error(`✗ コネクタ作成失敗: ${fromId} → ${toId}`, error.message);
      throw error;
    }
  }

  /**
   * JSONファイルから業務フローをインポート
   */
  async importFromJson(jsonFile) {
    console.log('\n🚀 Miroへのエクスポート開始...\n');

    const flowData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const itemIds = {}; // 作成したアイテムのIDを保存

    // レイアウト設定をJSONから読み取り（デフォルト: 6200x3100）
    const layout = flowData.layout || {};
    const swWidth = layout.swimlane_width || 6200;
    const swCenterX = layout.swimlane_center_x || 3100;

    // 1. スイムレーンを作成
    console.log('📋 スイムレーン作成中...');
    for (const swimlane of flowData.swimlanes) {
      const swHeight = swimlane.height || 350;
      const yPos = swimlane.y_position || 0;
      const frame = await this.createSwimlane(
        swimlane.name,
        swCenterX,
        yPos + Math.floor(swHeight / 2),
        swWidth,
        swHeight
      );
      itemIds[`swimlane_${swimlane.name}`] = frame.id;
      await this.sleep(200);
    }

    // 2. タスクカードを作成
    console.log('\n📝 タスクカード作成中...');
    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards || []) {
        let item;
        if (card.type === 'decision') {
          item = await this.createDecisionNode(
            card.title,
            card.x,
            card.y,
            card.width,
            card.height
          );
        } else {
          item = await this.createTaskCard(
            card.title,
            card.x,
            card.y,
            card.width,
            card.height,
            card.metadata
          );
        }
        itemIds[card.id] = item.id;
        await this.sleep(200);
      }
    }

    // 3. ドキュメントアイコンを作成
    if (flowData.documents && flowData.documents.length > 0) {
      console.log('\n📄 ドキュメント作成中...');
      for (const doc of flowData.documents) {
        const item = await this.createDocumentIcon(
          doc.name,
          doc.x,
          doc.y
        );
        itemIds[`doc_${doc.name}`] = item.id;
        await this.sleep(200);
      }
    }

    // 4. システムアイコンを作成
    if (flowData.systems && flowData.systems.length > 0) {
      console.log('\n💻 システム作成中...');
      for (const system of flowData.systems) {
        const item = await this.createSystemIcon(
          system.name,
          system.x,
          system.y
        );
        itemIds[`sys_${system.name}`] = item.id;
        await this.sleep(200);
      }
    }

    // 5. コネクタを作成
    if (flowData.connectors && flowData.connectors.length > 0) {
      console.log('\n🔗 コネクタ作成中...');

      // カード位置情報を収集（コネクタのルーティングに使用）
      const cardInfo = {};
      for (const swimlane of flowData.swimlanes) {
        for (const card of swimlane.cards || []) {
          cardInfo[card.id] = {
            x: card.x,
            y: card.y,
            swimlane: swimlane.name,
            type: card.type
          };
        }
      }

      // 同一ノードからのフォワードコネクタ数を事前集計（ラベル位置分散用）
      const forwardOutCount = {};  // nodeId → フォワードコネクタ総数
      const forwardOutIndex = {};  // nodeId → 現在のインデックス
      for (const connector of flowData.connectors) {
        const label = connector.label || '';
        if (!this.isBackwardLabel(label)) {
          forwardOutCount[connector.from] = (forwardOutCount[connector.from] || 0) + 1;
        }
      }

      // キャプション位置の分散パターン
      const captionPositions = ['40%', '60%', '50%'];

      for (const connector of flowData.connectors) {
        const fromId = itemIds[connector.from];
        const toId = itemIds[connector.to];

        if (fromId && toId) {
          const label = connector.label || '';
          const isBackward = this.isBackwardLabel(label);

          const fromInfo = cardInfo[connector.from] || {};
          const toInfo = cardInfo[connector.to] || {};

          // フォワードコネクタのインデックスを取得
          let siblingIndex = 0;
          if (!isBackward) {
            forwardOutIndex[connector.from] = (forwardOutIndex[connector.from] || 0);
            siblingIndex = forwardOutIndex[connector.from];
            forwardOutIndex[connector.from]++;
          }

          const { snapFrom, snapTo } = this.determineSnap(fromInfo, toInfo, isBackward, siblingIndex);

          // キャプション位置: 同一ノードから複数出る場合は分散
          let captionPos = '50%';
          if (!isBackward && label && forwardOutCount[connector.from] > 1) {
            captionPos = captionPositions[siblingIndex % captionPositions.length];
          } else if (isBackward && label) {
            captionPos = '40%';  // 差し戻しラベルはカーブの前半に寄せる
          }

          await this.createConnector(fromId, toId, label, isBackward, snapFrom, snapTo, captionPos);
          await this.sleep(200);
        } else {
          console.warn(`⚠️ コネクタのID解決失敗: ${connector.from} → ${connector.to}`);
        }
      }
    }

    // 6. スイムレーンを背面に送る（コネクタが隠れないようにする）
    console.log('\n🔝 z-order調整中...');
    for (const swimlane of flowData.swimlanes) {
      const frameId = itemIds[`swimlane_${swimlane.name}`];
      if (frameId) {
        await this.sendFrameToBack(frameId, swCenterX, swimlane.y_position || 0, swimlane.height || 350);
        await this.sleep(100);
      }
    }

    // 7. シェイプを前面に出す（コネクタの上にシェイプを表示するため）
    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards || []) {
        const miroId = itemIds[card.id];
        if (miroId) {
          await this.bringShapeToFront(miroId, card.x, card.y);
          await this.sleep(100);
        }
      }
    }
    for (const doc of flowData.documents || []) {
      const miroId = itemIds[`doc_${doc.name}`];
      if (miroId) {
        await this.bringShapeToFront(miroId, doc.x, doc.y);
        await this.sleep(100);
      }
    }
    for (const system of flowData.systems || []) {
      const miroId = itemIds[`sys_${system.name}`];
      if (miroId) {
        await this.bringShapeToFront(miroId, system.x, system.y);
        await this.sleep(100);
      }
    }

    console.log('\n✅ エクスポート完了！\n');
    console.log(`🔗 Miroボード: https://miro.com/app/board/${this.boardId}/`);
  }

  /**
   * フレームの位置を再更新してz-orderを背面にする（最初に更新＝最背面）
   */
  async sendFrameToBack(frameId, centerX, yPos, height) {
    try {
      await this.makeRequest(
        'PATCH',
        `/v2/boards/${this.boardId}/frames/${frameId}`,
        { position: { x: centerX, y: yPos + Math.floor(height / 2), origin: 'center' } }
      );
    } catch (error) {
      // z-order更新の失敗は無視
    }
  }

  /**
   * シェイプの位置を再更新してz-orderを前面にする
   */
  async bringShapeToFront(shapeId, x, y) {
    try {
      await this.makeRequest(
        'PATCH',
        `/v2/boards/${this.boardId}/shapes/${shapeId}`,
        { position: { x, y, origin: 'center' } }
      );
    } catch (error) {
      // z-order更新の失敗は無視
    }
  }

  /**
   * 待機関数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// メイン実行
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
使用方法:
  node miro-exporter.js <json-file>

例:
  node miro-exporter.js output.json

環境変数:
  MIRO_ACCESS_TOKEN - Miroアクセストークン
  MIRO_BOARD_ID - 出力先ボードID
    `);
    process.exit(1);
  }

  const jsonFile = args[0];

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ ファイルが見つかりません: ${jsonFile}`);
    process.exit(1);
  }

  try {
    const exporter = new MiroExporter();
    exporter.importFromJson(jsonFile).catch(error => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ 初期化エラー:', error.message);
    process.exit(1);
  }
}

module.exports = MiroExporter;
