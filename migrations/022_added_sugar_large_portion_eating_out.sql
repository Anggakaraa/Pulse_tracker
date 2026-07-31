alter table glucomove_meals
  add column if not exists added_sugar   boolean not null default false,
  add column if not exists large_portion boolean not null default false,
  add column if not exists eating_out    boolean not null default false;
