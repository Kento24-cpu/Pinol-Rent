import * as SQLite from 'expo-sqlite'

interface CachedCar {
  id: number
  brand: string
  model: string
  year: number
  price_per_day: number
  department_name: string
  image_url: string | null
  avg_rating: number
  reviews_count: number
}

interface OfflineAction {
  id: number
  type: string
  payload: string
  created_at: string
}

const CACHE_TTL_MS = 5 * 60 * 1000

let db: SQLite.SQLiteDatabase | null = null

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('pinol-rent-offline.db')
    await db.execAsync(`
      create table if not exists cached_cars (
        id integer primary key,
        brand text not null,
        model text not null,
        year integer,
        price_per_day real,
        department_name text not null default '',
        image_url text,
        avg_rating real default 0,
        reviews_count integer default 0,
        cached_at text not null default current_timestamp
      );
      create table if not exists cached_departments (
        id integer primary key,
        name text not null,
        slug text not null
      );
      create table if not exists cached_tags (
        id integer primary key,
        name text not null,
        slug text not null
      );
      create table if not exists offline_queue (
        id integer primary key autoincrement,
        type text not null,
        payload text not null,
        created_at text not null default current_timestamp
      );
    `)
  }
  return db
}

export async function cacheCars(cars: CachedCar[]) {
  const d = await getDb()
  const stmt = await d.prepareAsync(
    'insert or replace into cached_cars (id, brand, model, year, price_per_day, department_name, image_url, avg_rating, reviews_count, cached_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp)'
  )
  for (const car of cars) {
    await stmt.executeAsync([
      car.id, car.brand, car.model, car.year, car.price_per_day,
      car.department_name, car.image_url, car.avg_rating, car.reviews_count,
    ])
  }
  await stmt.finalizeAsync()
}

export async function getCachedCars(): Promise<CachedCar[]> {
  const d = await getDb()
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()
  const rows = await d.getAllAsync<CachedCar>(
    `select id, brand, model, year, price_per_day, department_name, image_url, avg_rating, reviews_count
     from cached_cars where cached_at >= ? order by cached_at desc`,
    cutoff
  )
  return rows
}

export async function clearStaleCache() {
  const d = await getDb()
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()
  await d.runAsync('delete from cached_cars where cached_at < ?', cutoff)
  await d.runAsync('delete from cached_departments')
  await d.runAsync('delete from cached_tags')
}

export async function cacheDepartments(departments: { id: number; name: string; slug: string }[]) {
  const d = await getDb()
  const stmt = await d.prepareAsync(
    'insert or replace into cached_departments (id, name, slug) values (?, ?, ?)'
  )
  for (const dept of departments) {
    await stmt.executeAsync([dept.id, dept.name, dept.slug])
  }
  await stmt.finalizeAsync()
}

export async function getCachedDepartments(): Promise<{ id: number; name: string; slug: string }[]> {
  const d = await getDb()
  return d.getAllAsync('select id, name, slug from cached_departments order by name')
}

export async function cacheTags(tags: { id: number; name: string; slug: string }[]) {
  const d = await getDb()
  const stmt = await d.prepareAsync(
    'insert or replace into cached_tags (id, name, slug) values (?, ?, ?)'
  )
  for (const tag of tags) {
    await stmt.executeAsync([tag.id, tag.name, tag.slug])
  }
  await stmt.finalizeAsync()
}

export async function getCachedTags(): Promise<{ id: number; name: string; slug: string }[]> {
  const d = await getDb()
  return d.getAllAsync('select id, name, slug from cached_tags order by name')
}

export async function enqueueOfflineAction(type: string, payload: unknown) {
  const d = await getDb()
  await d.runAsync(
    'insert into offline_queue (type, payload) values (?, ?)',
    type,
    JSON.stringify(payload)
  )
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  const d = await getDb()
  return d.getAllAsync<OfflineAction>(
    'select id, type, payload, created_at from offline_queue order by id asc'
  )
}

export async function dequeueOfflineAction(id: number) {
  const d = await getDb()
  await d.runAsync('delete from offline_queue where id = ?', id)
}

export async function clearOfflineQueue() {
  const d = await getDb()
  await d.runAsync('delete from offline_queue')
}
