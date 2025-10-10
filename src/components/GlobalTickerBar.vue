<template>
  <div class="toolbar">
    <label class="label" for="ticker">Ticker</label>
    <input
      id="ticker"
      class="input"
      v-model.trim="model"
      type="text"
      placeholder="e.g., ACN — press Enter or Load"
      @keyup.enter="$emit('submit')"
    />
    <button class="btn" @click="$emit('submit')">Load</button>
  </div>
</template>

<script setup>
const model = defineModel()
defineEmits(['submit'])
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; max-width: 1200px; margin: 0 auto; }
.label { font-size: 12px; opacity: 0.85; padding: 4px 0; }
.input {
  flex: 1 1 320px; padding: 10px 12px; border-radius: 10px;
  border: 1px solid #444; background: #2a2a2a; color: #fff;
  outline: none; transition: box-shadow .15s, border-color .15s;
}
.input:focus { border-color: #9bd6ff; box-shadow: 0 0 0 3px rgba(155,214,255,0.25); }
.btn {
  padding: 10px 14px; border-radius: 10px; border: 1px solid #444;
  background: #2a2a2a; color: #fff; cursor: pointer;
}
.btn:hover { background: #323232; }
</style>
