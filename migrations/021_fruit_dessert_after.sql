alter table glucomove_meals
  add column if not exists fruit_after   boolean not null default false,
  add column if not exists dessert_after boolean not null default false;
