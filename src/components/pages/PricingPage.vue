<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="emit('close')"
        tabindex="0"
      >
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <h2>Choose Your Plan</h2>
            <button class="close-button" @click="emit('close')" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-body">
            <div class="pricing-intro">
              <p class="subtitle">Start your 30-day free trial today</p>
            </div>

            <div class="pricing-grid">
              <PricingCard 
                :price="19"
                :trialDays="30"
                :features="premiumFeatures"
              />
            </div>

            <div class="faq-section">
              <h3>Frequently Asked Questions</h3>
              
              <div class="faq-item">
                <h4>What happens after my trial ends?</h4>
                <p>Your trial lasts 30 days. If you don't subscribe before it ends, you'll lose access to premium features. Your watchlist and data will be preserved if you decide to subscribe later.</p>
              </div>

              <div class="faq-item">
                <h4>Can I cancel anytime?</h4>
                <p>Yes! You can cancel your subscription at any time from your account settings. When you cancel, you'll keep access until the end of your current billing period.</p>
              </div>

              <div class="faq-item">
                <h4>What payment methods do you accept?</h4>
                <p>We accept all major credit cards (Visa, Mastercard, American Express) through Stripe, our secure payment processor.</p>
              </div>

              <div class="faq-item">
                <h4>Is my payment information secure?</h4>
                <p>Absolutely. We use Stripe for payment processing, which is PCI-DSS compliant and trusted by millions of businesses worldwide. We never store your credit card information.</p>
              </div>

              <div class="faq-item">
                <h4>What if I need help?</h4>
                <p>We're here to help! Contact us anytime through the feedback form in the menu or email us at support@datoro.com.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import PricingCard from '../subscription/PricingCard.vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const premiumFeatures = [
  'Unlimited company analysis',
  'Real-time market data',
  'Advanced charts & metrics',
  'AI-powered insights',
  'Custom watchlists',
  'Priority support'
]
</script>

<style scoped>
/* Modal overlay and transitions - matching project style */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  outline: none;
}

.modal-container {
  background: #1a1a1a;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 900px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 168, 142, 0.2); /* Project green */
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 32px 24px;
  overflow-y: auto;
}

.pricing-intro {
  text-align: center;
  margin-bottom: 32px;
}

.subtitle {
  font-size: 16px;
  color: #999;
  margin: 0;
}

.pricing-grid {
  display: flex;
  justify-content: center;
  margin-bottom: 48px;
}

.faq-section {
  max-width: 700px;
  margin: 0 auto;
}

.faq-section h3 {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 24px 0;
  text-align: center;
}

.faq-item {
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.faq-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(0, 168, 142, 0.3); /* Project green on hover */
}

.faq-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.faq-item p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #999;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-container {
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .modal-header h2 {
    font-size: 20px;
  }

  .modal-body {
    padding: 24px 16px;
  }

  .subtitle {
    font-size: 14px;
  }

  .faq-section h3 {
    font-size: 18px;
  }

  .faq-item {
    padding: 16px;
  }

  .faq-item h4 {
    font-size: 15px;
  }

  .faq-item p {
    font-size: 13px;
  }
}
</style>
