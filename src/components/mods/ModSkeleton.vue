<template>
  <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
    <div v-for="i in 6" :key="i" class="skeleton-card rounded-xl bg-white/[0.03] p-4">
      <div class="flex items-start justify-between">
        <div class="flex flex-col gap-2 flex-1">
          <div class="skeleton-block h-4 w-3/4 rounded-lg" />
          <div class="flex gap-1.5">
            <div class="skeleton-block h-3.5 w-16 rounded-full" />
            <div class="skeleton-block h-3.5 w-20 rounded-full" />
          </div>
        </div>
        <div class="skeleton-block h-3 w-8 rounded" />
      </div>

      <div class="flex flex-col gap-1.5 pt-1">
        <div class="skeleton-block h-3 w-full rounded" />
        <div class="skeleton-block h-3 w-4/5 rounded" />
      </div>

      <div class="mt-auto flex flex-col gap-3 pt-3">
        <div class="skeleton-block h-9 w-full rounded-xl" />
      </div>
    </div>
  </div>
</template>
