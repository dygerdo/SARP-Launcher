<template>
  <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
    <div v-for="i in 6" :key="i" class="skeleton-card">
      <div class="flex items-start justify-between">
        <div class="flex flex-col gap-2 flex-1">
          <div class="skeleton-block h-4 w-3/4 rounded" />
          <div class="flex gap-1.5">
            <div class="skeleton-block h-3.5 w-16 rounded-full" />
            <div class="skeleton-block h-3.5 w-20 rounded-full" />
          </div>
        </div>
        <div class="skeleton-block h-3 w-8" />
      </div>

      <div class="flex flex-col gap-1.5 pt-1">
        <div class="skeleton-block h-3 w-full" />
        <div class="skeleton-block h-3 w-4/5" />
      </div>

      <div class="mt-auto flex flex-col gap-3 pt-3">
        <div class="skeleton-block h-9 w-full rounded-md" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Shimmer is handled by global .skeleton-block in style.css */
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
