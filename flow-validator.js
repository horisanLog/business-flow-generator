#!/usr/bin/env node

/**
 * 業務フロー品質検証ツール
 * 8つの品質ポイントに基づいた検証を実行
 */

const fs = require('fs');

class FlowValidator {
  constructor(config = {}) {
    this.config = {
      gridSize: config.gridSize || 50,           // グリッドサイズ（座標計算ルール）
      minNodeSpacing: config.minNodeSpacing || 300,  // ノード間最小距離
      minVerticalSpacing: config.minVerticalSpacing || 150,
      maxLoopDepth: config.maxLoopDepth || 5,    // 最大ループ深度
      swimlaneWidth: config.swimlaneWidth || 6200,
      swimlanePadding: config.swimlanePadding || 100
    };

    this.errors = [];
    this.warnings = [];
    this.stats = {};
  }

  /**
   * ① 座標計算ルール：正確な原点設定と単位統一
   */
  validateCoordinates(flowData) {
    console.log('\n✓ ① 座標計算ルール検証中...');
    let issues = 0;

    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards) {
        // グリッドに整列しているか
        if (card.x % this.config.gridSize !== 0) {
          this.warnings.push(
            `カード ${card.id} のX座標 (${card.x}) がグリッド (${this.config.gridSize}px) に整列していません`
          );
          issues++;
        }

        // スイムレーン範囲内にあるか
        const swimlaneLeft = 0;
        const swimlaneRight = this.config.swimlaneWidth;
        const cardLeft = card.x - card.width / 2;
        const cardRight = card.x + card.width / 2;

        if (cardLeft < swimlaneLeft || cardRight > swimlaneRight) {
          this.errors.push(
            `カード ${card.id} がスイムレーン範囲外にあります (x: ${card.x}, width: ${card.width})`
          );
          issues++;
        }
      }
    }

    console.log(`   ${issues === 0 ? '✓' : '⚠'} 座標検証: ${issues} 件の問題`);
    return issues === 0;
  }

  /**
   * ② 接続点の重複禁止：ノードの明確な分離
   */
  validateNodeOverlap(flowData) {
    console.log('\n✓ ② 接続点の重複検証中...');
    let overlaps = 0;

    const allCards = [];
    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards) {
        allCards.push({ ...card, swimlane: swimlane.name });
      }
    }

    // すべてのカードペアをチェック
    for (let i = 0; i < allCards.length; i++) {
      for (let j = i + 1; j < allCards.length; j++) {
        const card1 = allCards[i];
        const card2 = allCards[j];

        const distance = Math.sqrt(
          Math.pow(card2.x - card1.x, 2) + Math.pow(card2.y - card1.y, 2)
        );

        const minDistance = Math.max(
          (card1.width + card2.width) / 2,
          (card1.height + card2.height) / 2,
          this.config.minNodeSpacing
        );

        if (distance < minDistance) {
          this.errors.push(
            `カード ${card1.id} と ${card2.id} が近すぎます (距離: ${distance.toFixed(0)}px, 最小: ${minDistance}px)`
          );
          overlaps++;
        }
      }
    }

    console.log(`   ${overlaps === 0 ? '✓' : '⚠'} 重複検証: ${overlaps} 件の重複`);
    return overlaps === 0;
  }

  /**
   * ③ 差戻し構造配置：制御されたループ構造
   */
  validateLoopStructure(flowData) {
    console.log('\n✓ ③ 差戻し構造検証中...');
    let issues = 0;

    const graph = this.buildGraph(flowData);
    const loops = this.detectLoops(graph);

    if (loops.length > this.config.maxLoopDepth) {
      this.warnings.push(
        `ループが多すぎます (${loops.length} 件、推奨: ${this.config.maxLoopDepth} 件以下)`
      );
      issues++;
    }

    // ループに終了条件があるか確認
    for (const loop of loops) {
      const hasDecision = loop.some(nodeId => {
        const node = this.findNodeById(flowData, nodeId);
        return node && node.type === 'decision';
      });

      if (!hasDecision) {
        this.warnings.push(
          `ループ ${loop.join(' → ')} に判断ノードがありません（無限ループの可能性）`
        );
        issues++;
      }
    }

    console.log(`   ${issues === 0 ? '✓' : '⚠'} ループ検証: ${loops.length} 件のループ、${issues} 件の問題`);
    return issues === 0;
  }

  /**
   * ④ タイムライン位置関係：シーケンシャルな順序付け
   */
  validateTimeline(flowData) {
    console.log('\n✓ ④ タイムライン検証中...');
    let issues = 0;

    // トポロジカルソートで階層を計算
    const graph = this.buildGraph(flowData);
    const layers = this.computeLayers(graph);

    // 各コネクタについて、fromがtoより左にあるか確認
    for (const connector of flowData.connectors) {
      const fromNode = this.findNodeById(flowData, connector.from);
      const toNode = this.findNodeById(flowData, connector.to);

      if (!fromNode || !toNode) continue;

      // 差し戻し・不合格・合格（部門またぎ）以外は左から右へ
      const fromSwimlane = this.findSwimlaneForNode(flowData, connector.from);
      const toSwimlane = this.findSwimlaneForNode(flowData, connector.to);
      const isCrossSwimlane = fromSwimlane !== toSwimlane;

      if (!connector.label?.includes('差し戻し') &&
          !connector.label?.includes('不可') &&
          !connector.label?.includes('不合格') &&
          !connector.label?.includes('却下') &&
          !connector.label?.includes('合格') &&
          !isCrossSwimlane &&
          fromNode.x >= toNode.x) {
        this.warnings.push(
          `コネクタ ${connector.from} → ${connector.to} が時系列に反しています (${fromNode.x} → ${toNode.x})`
        );
        issues++;
      }
    }

    console.log(`   ${issues === 0 ? '✓' : '⚠'} タイムライン検証: ${issues} 件の問題`);
    return issues === 0;
  }

  /**
   * ⑤ システム色分け：機能別カラーの標準化
   */
  validateColorScheme(flowData) {
    console.log('\n✓ ⑤ システム色分け検証中...');

    const colorScheme = {
      '営業部': '#e0f2ff',
      '企画部': '#fff4e0',
      '経営層': '#ffe0f0',
      '総務部': '#f0e0ff',
      '開発部': '#e0fff0',
      '品質管理部': '#ffe0e0'
    };

    // 現在の実装では全て同じ色を使用しているため、今後の改善ポイント
    console.log('   ℹ 色分けシステムは今後実装予定');
    return true;
  }

  /**
   * ⑥ 実行順序明確化：ステップバイステップの進行
   */
  validateExecutionOrder(flowData) {
    console.log('\n✓ ⑥ 実行順序検証中...');

    const graph = this.buildGraph(flowData);
    const hasCycle = this.hasCycle(graph);

    if (hasCycle) {
      console.log('   ⚠ サイクルが検出されました（差し戻しフローを含む）');
    } else {
      console.log('   ✓ 実行順序は明確です');
    }

    return true;
  }

  /**
   * ⑦ チェックリスト活用：検証プロセスの徹底
   */
  generateChecklist(flowData) {
    console.log('\n✓ ⑦ チェックリスト生成中...');

    const checklist = {
      '基本項目': [
        { item: 'スイムレーンが定義されている', check: flowData.swimlanes?.length > 0 },
        { item: 'カードが配置されている', check: flowData.swimlanes?.some(s => s.cards?.length > 0) },
        { item: 'コネクタが定義されている', check: flowData.connectors?.length > 0 }
      ],
      '品質項目': [
        { item: '座標がグリッドに整列', check: this.errors.filter(e => e.includes('グリッド')).length === 0 },
        { item: 'ノードの重複なし', check: this.errors.filter(e => e.includes('近すぎます')).length === 0 },
        { item: 'タイムライン順序正常', check: this.errors.filter(e => e.includes('時系列')).length === 0 }
      ],
      '完成度': [
        { item: 'ドキュメントアイコン配置', check: flowData.documents?.length > 0 },
        { item: 'システムアイコン配置', check: flowData.systems?.length > 0 },
        { item: 'メタデータ入力完了', check: this.checkMetadataComplete(flowData) }
      ]
    };

    for (const [category, items] of Object.entries(checklist)) {
      console.log(`\n   ${category}:`);
      for (const { item, check } of items) {
        console.log(`     ${check ? '✓' : '☐'} ${item}`);
      }
    }

    return checklist;
  }

  /**
   * ⑧ レイヤー構造管理：整理されたレイヤー階層
   */
  validateLayerStructure(flowData) {
    console.log('\n✓ ⑧ レイヤー構造検証中...');

    const layers = {
      'スイムレーン': flowData.swimlanes?.length || 0,
      'タスクカード': this.countByType(flowData, 'task'),
      '判断ノード': this.countByType(flowData, 'decision'),
      'ドキュメント': flowData.documents?.length || 0,
      'システム': flowData.systems?.length || 0,
      'コネクタ': flowData.connectors?.length || 0
    };

    for (const [layer, count] of Object.entries(layers)) {
      console.log(`   - ${layer}: ${count} 件`);
    }

    this.stats = layers;
    return true;
  }

  /**
   * 総合検証実行
   */
  validate(flowData) {
    console.log('🔍 業務フロー品質検証開始\n');
    console.log('=' .repeat(60));

    this.errors = [];
    this.warnings = [];

    const results = {
      coordinates: this.validateCoordinates(flowData),
      overlap: this.validateNodeOverlap(flowData),
      loops: this.validateLoopStructure(flowData),
      timeline: this.validateTimeline(flowData),
      colors: this.validateColorScheme(flowData),
      order: this.validateExecutionOrder(flowData),
      layers: this.validateLayerStructure(flowData)
    };

    this.generateChecklist(flowData);

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 検証結果サマリー\n');

    const passCount = Object.values(results).filter(r => r).length;
    const totalCount = Object.keys(results).length;

    console.log(`✓ 合格: ${passCount} / ${totalCount} 項目`);
    console.log(`⚠ エラー: ${this.errors.length} 件`);
    console.log(`⚠ 警告: ${this.warnings.length} 件`);

    if (this.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      this.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告詳細:');
      this.warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    }

    console.log('\n' + '='.repeat(60));

    return {
      passed: this.errors.length === 0,
      results,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.stats
    };
  }

  // ヘルパーメソッド
  buildGraph(flowData) {
    const nodes = new Map();
    const edges = [];

    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards) {
        nodes.set(card.id, card);
      }
    }

    for (const connector of flowData.connectors) {
      edges.push({ from: connector.from, to: connector.to });
    }

    return { nodes, edges };
  }

  detectLoops(graph) {
    const loops = [];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId, path = []) => {
      if (recStack.has(nodeId)) {
        const loopStart = path.indexOf(nodeId);
        if (loopStart >= 0) {
          loops.push(path.slice(loopStart));
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const outEdges = graph.edges.filter(e => e.from === nodeId);
      for (const edge of outEdges) {
        dfs(edge.to, [...path]);
      }

      recStack.delete(nodeId);
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return loops;
  }

  hasCycle(graph) {
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId) => {
      if (recStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recStack.add(nodeId);

      const outEdges = graph.edges.filter(e => e.from === nodeId);
      for (const edge of outEdges) {
        if (dfs(edge.to)) return true;
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const nodeId of graph.nodes.keys()) {
      if (dfs(nodeId)) return true;
    }

    return false;
  }

  computeLayers(graph) {
    const layers = new Map();
    const inDegree = new Map();

    // 初期化
    for (const nodeId of graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    // 入次数を計算
    for (const edge of graph.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // BFS
    const queue = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
        layers.set(nodeId, 0);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      const currentLayer = layers.get(current);

      const outEdges = graph.edges.filter(e => e.from === current);
      for (const edge of outEdges) {
        const newDegree = inDegree.get(edge.to) - 1;
        inDegree.set(edge.to, newDegree);

        if (newDegree === 0) {
          queue.push(edge.to);
          layers.set(edge.to, currentLayer + 1);
        }
      }
    }

    return layers;
  }

  findSwimlaneForNode(flowData, nodeId) {
    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards) {
        if (card.id === nodeId) {
          return swimlane.name;
        }
      }
    }
    return null;
  }

  findNodeById(flowData, nodeId) {
    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards) {
        if (card.id === nodeId) {
          return card;
        }
      }
    }
    return null;
  }

  countByType(flowData, type) {
    let count = 0;
    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards) {
        if (card.type === type) count++;
      }
    }
    return count;
  }

  checkMetadataComplete(flowData) {
    let complete = 0;
    let total = 0;

    for (const swimlane of flowData.swimlanes) {
      for (const card of swimlane.cards) {
        total++;
        if (card.metadata && card.metadata.duration) {
          complete++;
        }
      }
    }

    return complete / total > 0.8;
  }
}

// メイン実行
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
使用方法:
  node flow-validator.js <json-file>

例:
  node flow-validator.js examples/sample-output-clean.json

説明:
  8つの品質ポイントに基づいて業務フローを検証します。
    `);
    process.exit(1);
  }

  const jsonFile = args[0];

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ ファイルが見つかりません: ${jsonFile}`);
    process.exit(1);
  }

  try {
    const flowData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const validator = new FlowValidator();
    const result = validator.validate(flowData);

    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

module.exports = FlowValidator;
