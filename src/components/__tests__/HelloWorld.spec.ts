import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

describe('InlineMessage', () => {
  const TestComponent = defineComponent({
    props: {
      msg: {
        type: String,
        required: true
      }
    },
    template: `<div data-testid="message">{{ msg }}</div>`
  })

  it('renders the provided message', () => {
    const wrapper = mount(TestComponent, { props: { msg: 'Hello Vitest' } })
    expect(wrapper.get('[data-testid="message"]').text()).toBe('Hello Vitest')
  })
})
