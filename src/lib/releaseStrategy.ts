import type { ChangeOrder, ReleaseStrategyConfig, ReleaseStrategyKind } from '../types';

/** 金丝雀模式固定灰度流量比例（与产品约定一致） */
export const CANARY_TRAFFIC_PERCENT = 50;

/** 发布策略中文名称 */
const KIND_LABEL: Record<ReleaseStrategyKind, string> = {
  canary: `金丝雀（${CANARY_TRAFFIC_PERCENT}% 灰度）`,
  full: '全量发布',
};

/** 新建变更单默认：金丝雀 50% */
export function defaultReleaseStrategy(): ReleaseStrategyConfig {
  return { kind: 'canary' };
}

/** 策略类型展示名 */
export function releaseStrategyKindLabel(kind: ReleaseStrategyKind): string {
  return KIND_LABEL[kind] ?? kind;
}

/**
 * 解析变更单发布策略；兼容旧数据（滚动/蓝绿等并入「全量」展示）
 */
export function getReleaseStrategy(order: ChangeOrder): ReleaseStrategyConfig {
  const rs = order.releaseStrategy;
  if (rs?.kind === 'canary' || rs?.kind === 'full') {
    return { kind: rs.kind };
  }
  // 旧版 rolling / blue_green 等仅保留两种策略时映射为全量
  if (rs && 'kind' in rs && (rs as { kind: string }).kind !== 'canary' && (rs as { kind: string }).kind !== 'full') {
    return { kind: 'full' };
  }
  if (order.canaryConfig?.enabled) {
    return { kind: 'canary' };
  }
  return { kind: 'full' };
}

/** 表单/列表短文案 */
export function formatReleaseStrategyShort(rs: ReleaseStrategyConfig): string {
  return rs.kind === 'canary' ? `金丝雀 ${CANARY_TRAFFIC_PERCENT}%` : '全量';
}

/** 列表一行摘要 */
export function releaseStrategySummary(order: ChangeOrder): string {
  return formatReleaseStrategyShort(getReleaseStrategy(order));
}

/** 部署页策略说明 */
export function releaseStrategyDetailLines(rs: ReleaseStrategyConfig): string[] {
  if (rs.kind === 'canary') {
    return [
      `先将 ${CANARY_TRAFFIC_PERCENT}% 流量导入新版本实例，观察错误率与核心指标。`,
      '验证通过后自动或手动提升至全量；未通过则切回旧版本。',
    ];
  }
  return ['一次性将生产流量全部切换至新版本，请确认窗口期与回滚预案。'];
}
