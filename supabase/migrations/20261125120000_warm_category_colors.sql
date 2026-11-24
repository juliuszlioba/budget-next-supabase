-- Switch the default category colours to the Graphite & Amber palette.
-- Only categories still using an old default colour are changed; custom colours are kept.
update public.categories c
set color = m.new_color
from (values
  ('#2f8f5b', '#f2b340'),  -- Housing & utilities
  ('#e0a23a', '#e8954a'),  -- Food
  ('#4f86c6', '#c9a46a'),  -- Transport
  ('#8b6fd1', '#b8875c'),  -- Subscriptions
  ('#5b9aa0', '#8e8c87'),  -- Insurance
  ('#d9707f', '#d97a4a'),  -- Shopping
  ('#53b3a3', '#e0c27a'),  -- Health & care
  ('#e9875c', '#f0a35e'),  -- Fun & trips
  ('#9a9aa0', '#6e6c68'),  -- Credit card
  ('#b0a58f', '#a8a49c')   -- Other
) as m(old_color, new_color)
where lower(c.color) = m.old_color;
