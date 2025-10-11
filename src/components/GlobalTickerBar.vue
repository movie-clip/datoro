<template>
  <div class="toolbar">
    <div class="ticker-input-section">
      <label class="label" for="ticker">Ticker</label>
      <input
        id="ticker"
        class="input"
        v-model.trim="model"
        type="text"
        placeholder="e.g., AAPL"
        @keyup.enter="$emit('submit')"
      />
      <button class="btn" @click="$emit('submit')">Search</button>
    </div>
    
    <CompanyHeader 
      v-if="model" 
      :ticker="model" 
      @update:companyName="$emit('update:companyName', $event)"
    />
  </div>
</template>

<script setup>
import CompanyHeader from './CompanyHeader.vue'

const model = defineModel()
defineEmits(['submit', 'update:companyName'])
</script>

<style scoped>
.toolbar { 
  display: flex; 
  gap: 16px; 
  align-items: stretch; 
  max-width: 1200px; 
  margin: 0 auto; 
}

.ticker-input-section {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid #444;
  flex: 1;
}

.label { 
  font-size: 12px; 
  opacity: 0.85; 
  white-space: nowrap;
}

.input {
  flex: 1;
  padding: 10px 12px; 
  border-radius: 10px;
  border: 1px solid #444; 
  background: #2a2a2a; 
  color: #fff;
  outline: none; 
  transition: box-shadow .15s, border-color .15s;
}

.input:focus { 
  border-color: #9bd6ff; 
  box-shadow: 0 0 0 3px rgba(155,214,255,0.25); 
}

.btn {
  padding: 10px 20px; 
  border-radius: 10px; 
  border: 1px solid #444;
  background: #3a7bd5; 
  color: #fff; 
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn:hover { 
  background: #2d66b8; 
}
</style>
