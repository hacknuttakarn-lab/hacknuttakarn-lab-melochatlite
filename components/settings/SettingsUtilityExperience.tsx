'use client';

import QuestRewardAdminWeb from './QuestRewardAdminWeb';
import SettingsUtilityExperienceLegacy from './SettingsUtilityExperienceLegacy';

export type SettingsUtilityMode =
  | 'premium'
  | 'privacy'
  | 'blocked'
  | 'support'
  | 'diagnostics'
  | 'cleanup'
  | 'quest-admin'
  | 'review-admin';

export default function SettingsUtilityExperience({
  mode,
  embedded = false,
}: {
  mode:
    SettingsUtilityMode;

  embedded?:
    boolean;
}) {
  /*
   * Quest / Reward Admin Web V2
   *
   * แยกเฉพาะ Quest Admin ออกจาก Utility เดิม
   * เพื่อไม่ให้การพัฒนาหน้านี้กระทบ
   * Privacy / Premium / Support / Cleanup /
   * Blocked / Diagnostics / Review Admin
   */
  if (
    mode ===
    'quest-admin'
  ) {
    return (
      <QuestRewardAdminWeb
        embedded={
          embedded
        }
      />
    );
  }

  /*
   * หน้า Utility อื่นทั้งหมด
   * ใช้ไฟล์เดิม 100%
   */
  return (
    <SettingsUtilityExperienceLegacy
      mode={
        mode
      }
      embedded={
        embedded
      }
    />
  );
}