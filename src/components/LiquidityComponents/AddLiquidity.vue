<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { onMounted, reactive, watch } from 'vue'
import initPriceDecimals from '@/scripts/asset/initPriceDecimals'
const toast = useToast()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()

const state = reactive({
  shape: 'focused',
  fee: 0.3,
  prices: [0, 1],
  tickLow: 1,
  priceDecimalsLow: 3,
  tickHigh: 1,
  priceDecimalsHigh: 3
})
const initPriceDecimalsState = () => {
  const decLow = initPriceDecimals(state.prices[0], 2)
  state.tickLow = decLow.tick
  state.priceDecimalsLow = decLow.priceDecimals
  const decHigh = initPriceDecimals(state.prices[1], 2)
  state.tickHigh = decHigh.tick
  state.priceDecimalsHigh = decHigh.priceDecimals
}
onMounted(() => {
  initPriceDecimalsState()
})
watch(
  () => state.prices[0],
  () => {
    initPriceDecimalsState()
  }
)
watch(
  () => state.prices[1],
  () => {
    initPriceDecimalsState()
  }
)
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>Add liquidity</h2>
      <h3>Liquidity shape</h3>
      <p>
        Liquidity shape allows you to place your liquidity into several bins and aggragete liquidity
        with other traders
      </p>
      <div>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'focused' ? 'primary' : 'secondary'"
          @click="state.shape = 'focused'"
        >
          Focused liquidity shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'spread' ? 'primary' : 'secondary'"
          @click="state.shape = 'spread'"
        >
          Spread shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'equal' ? 'primary' : 'secondary'"
          @click="state.shape = 'equal'"
        >
          Equal bin shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'single' ? 'primary' : 'secondary'"
          @click="state.shape = 'single'"
        >
          Single bin shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'wall' ? 'primary' : 'secondary'"
          @click="state.shape = 'wall'"
        >
          Wall order
        </Button>
        <p v-if="state.shape === 'focused'">
          Focused liquidity shape takes current price and adds the most liqudity to the current bin
          price. It adds little less liquidity to the surrounding bins, and adds minimum liquidity
          to the min and max price.
        </p>
        <p v-if="state.shape === 'spread'">
          Spread liquidity shape takes current price and adds the small liqudity to the current bin
          price. It adds little more liquidity to the surrounding bins, and adds maximum liquidity
          to the min and max price.
        </p>
        <p v-if="state.shape === 'equal'">
          Equal liquidity shape adds the same liquidity to all bins from min to max price.
        </p>
        <p v-if="state.shape === 'single'">
          Single bin does not use the bin tick system but uses the single liquidity pool with
          defined minimum price and maximum price.
        </p>
        <p v-if="state.shape === 'wall'">
          Wall order allows you to define the single price and when current price is below, others
          can buy at the price level, and if the current price is above the fixed price others will
          sell at the price level. This order type allows you to make a liquidity wall, and you will
          earn money whenever the price is volatile over this price level.
        </p>
        <h3>Trading fee</h3>
        <p>
          You can set the trading fee ranging from 0% to 10% with precision on 6 decimal places.
          This trading fee is the liquidity provider income. It is compounded automatically in each
          trading bin. It is recommended to use the common trading fees so that you will aggragate
          your liquidity with other LPs. Trading fee set in here is the base from which the trader's
          fee is calculated according to his engagement level. New traders will pay to you 2x of the
          base fee, while gaining the trading experience reduces the trading fee to the base level.
        </p>
        <InputGroup>
          <InputNumber
            v-model="state.fee"
            :min="0"
            :max="10"
            :step="0.1"
            :max-fraction-digits="6"
            show-buttons
          ></InputNumber>
          <InputGroupAddon>%</InputGroupAddon>
        </InputGroup>
        <div v-if="state.shape === 'wall'">
          <h3>Price Wall</h3>
          <Slider
            v-model="state.prices[0]"
            class="w-full my-2"
            :step="state.tickHigh"
            :max-fraction-digits="state.priceDecimalsHigh"
          />
          <InputGroup>
            <InputNumber
              v-model="state.prices[0]"
              :min="0"
              :max-fraction-digits="state.priceDecimalsLow"
              :step="state.tickLow"
              show-buttons
            ></InputNumber>
            <InputGroupAddon class="w-12rem">
              <div class="px-3">
                {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
              </div>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div v-else>
          <h3>Prices</h3>
          <Slider
            v-model="state.prices"
            range
            class="w-full my-2"
            :step="state.tickHigh"
            :max-fraction-digits="state.priceDecimalsHigh"
          />
          <div class="grid">
            <div class="col">
              <div>Low price</div>
              <InputGroup>
                <InputNumber
                  v-model="state.prices[0]"
                  :min="0"
                  :max="state.prices[1]"
                  :max-fraction-digits="state.priceDecimalsLow"
                  :step="state.tickLow"
                  show-buttons
                ></InputNumber>
                <InputGroupAddon class="w-12rem">
                  <div class="px-3">
                    {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div class="col">
              <div>High price</div>
              <InputGroup>
                <InputNumber
                  v-model="state.prices[1]"
                  :min="0"
                  :max-fraction-digits="state.priceDecimalsHigh"
                  :step="state.tickHigh"
                  show-buttons
                ></InputNumber>
                <InputGroupAddon class="w-12rem">
                  <div class="px-3">
                    {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
<style></style>
