ALTER TABLE t_p99966623_warm_meetings_experi.event_custom_types
  ADD COLUMN IF NOT EXISTS parent_type character varying(100) DEFAULT NULL;

UPDATE t_p99966623_warm_meetings_experi.event_custom_types SET value='банный_вечер', label='Банный вечер', icon='Flame',        sort_order=1 WHERE id=1;
UPDATE t_p99966623_warm_meetings_experi.event_custom_types SET value='знакомство',   label='Знакомства',  icon='Users',        sort_order=2 WHERE id=2;
UPDATE t_p99966623_warm_meetings_experi.event_custom_types SET value='практика',     label='Практики',    icon='Sparkles',     sort_order=3 WHERE id=3;
UPDATE t_p99966623_warm_meetings_experi.event_custom_types SET value='нетворкинг',   label='Нетворкинг',  icon='Briefcase',    sort_order=4 WHERE id=4;
UPDATE t_p99966623_warm_meetings_experi.event_custom_types SET value='курс',         label='Курсы',       icon='GraduationCap',sort_order=5 WHERE id=5;
UPDATE t_p99966623_warm_meetings_experi.event_custom_types SET value='фестиваль',    label='Фестивали',   icon='TreePine',     sort_order=6 WHERE id=6;
UPDATE t_p99966623_warm_meetings_experi.event_custom_types SET value='другое',       label='Другое',      icon='Circle',       sort_order=99 WHERE id=7;