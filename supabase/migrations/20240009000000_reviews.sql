-- Migration 9: Reviews & Ratings

create table if not exists reviews (
  id bigint primary key generated always as identity,
  booking_id bigint not null references bookings on delete cascade,
  car_id bigint not null references cars on delete cascade,
  renter_id uuid not null references profiles on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- unique: one review per booking
create unique index idx_reviews_booking on reviews (booking_id);
create index idx_reviews_car on reviews (car_id);

-- enable rls
alter table reviews enable row level security;

-- rls: participants can read
create policy "reviews_select_participant" on reviews
  for select using (
    auth.uid() = renter_id
    or exists (
      select 1 from cars where cars.id = reviews.car_id and cars.owner_id = auth.uid()
    )
  );

-- rls: renter inserts own (one per booking, only after completed)
create policy "reviews_insert_own" on reviews
  for insert with check (
    auth.uid() = renter_id
    and exists (
      select 1 from bookings
      where bookings.id = reviews.booking_id
        and bookings.renter_id = auth.uid()
        and bookings.status = 'completed'
    )
  );

-- rls: renter updates own
create policy "reviews_update_own" on reviews
  for update using (auth.uid() = renter_id)
  with check (auth.uid() = renter_id);

-- rls: renter deletes own
create policy "reviews_delete_own" on reviews
  for delete using (auth.uid() = renter_id);

-- add avg_rating + reviews_count to cars
alter table cars add column if not exists avg_rating numeric(3,2) default 0;
alter table cars add column if not exists reviews_count int default 0;

-- sync trigger
create or replace function sync_car_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'DELETE' then
    update cars
    set avg_rating = coalesce(
      (select round(avg(rating)::numeric, 2) from reviews where car_id = old.car_id),
      0
    ),
    reviews_count = (select count(*) from reviews where car_id = old.car_id)
    where id = old.car_id;
    return old;
  else
    update cars
    set avg_rating = coalesce(
      (select round(avg(rating)::numeric, 2) from reviews where car_id = coalesce(new.car_id, old.car_id)),
      0
    ),
    reviews_count = (select count(*) from reviews where car_id = coalesce(new.car_id, old.car_id))
    where id = coalesce(new.car_id, old.car_id);
    return coalesce(new, old);
  end if;
end;
$$;

create trigger trg_sync_car_rating
  after insert or update or delete on reviews
  for each row execute function sync_car_rating();
