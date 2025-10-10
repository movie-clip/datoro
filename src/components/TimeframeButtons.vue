<template>
  <div class="tfs">
    <button
      v-for="key in order"
      :key="key"
      :class="['btn', key === modelValue ? 'active' : '']"
      @click="$emit('update:modelValue', key)"
    >
      {{ key }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  order:      { type: Array,  default: () => [] }
})
</script>

<style scoped>
.tfs { display: flex; gap: 6px; flex-wrap: wrap; }
.btn {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #444;
  background: #2a2a2a; color: #fff; cursor: pointer;
  transition: box-shadow .15s, border-color .15s, background .15s;
}
.btn:hover { background: #323232; }
.btn.active { border-color: #9bd6ff; box-shadow: 0 0 0 3px rgba(155,214,255,0.25); }
</style>
