-- Categories now store a Lucide icon key instead of an emoji.
alter table public.categories alter column icon set default 'package';

update public.categories c
set icon = m.key
from (values
  ('🏠', 'house'),
  ('🛒', 'shopping-cart'),
  ('🚆', 'train-front'),
  ('📺', 'tv'),
  ('🛡️', 'shield'),
  ('🛍️', 'shopping-bag'),
  ('💊', 'pill'),
  ('🎮', 'gamepad-2'),
  ('💳', 'credit-card'),
  ('📦', 'package')
) as m(emoji, key)
where c.icon = m.emoji;

-- Anything else (a custom emoji) falls back to the generic icon.
update public.categories
set icon = 'package'
where icon !~ '^[a-z0-9-]+$';
