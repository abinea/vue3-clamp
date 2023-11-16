<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUpdated,
  onBeforeUnmount,
  nextTick,
  reactive,
  useSlots,
  RendererNode,
} from 'vue'
import {
  ResizeDetectorElement,
  addResizeListener,
  removeResizeListener,
} from 'resize-detector-typescript'

interface IProps {
  maxLines?: number
  maxHeight?: string | number
  expanded?: boolean
  tag?: string
  autoresize?: boolean
  ellipsis?: string
  location?: 'start' | 'middle' | 'end'
}

const props = withDefaults(defineProps<IProps>(), {
  tag: 'div',
  autoresize: false,
  expanded: false,
  ellipsis: '…',
  location: 'end',
})

const emit = defineEmits(['update:expanded', 'clampchange'])

const slots = useSlots()
const offset = ref(0)
const text = ref(getText())
const localExpanded = ref(!!props.expanded)
const unregisterResizeCallback = ref()

const clampRef = ref<ResizeDetectorElement>()
const textRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()

const clampedText = computed(() => {
  if (props.location === 'start') {
    return props.ellipsis + (text.value.slice(-offset) || '').trim()
  } else if (props.location === 'middle') {
    const split = Math.floor(offset.value / 2)
    return (
      (text.value.slice(0, split) || '').trim() +
      props.ellipsis +
      (text.value.slice(-split) || '').trim()
    )
  }

  return (text.value.slice(0, offset.value) || '').trim() + props.ellipsis
})
const isClamped = computed(() => {
  if (!text.value) return false
  return offset.value !== text.value.length
})

const realText = computed(() =>
  isClamped.value ? clampedText.value : text.value
)
const realMaxHeight = computed(() => {
  const { maxHeight } = props
  if (localExpanded.value || !maxHeight) return null
  return typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
})

watch(
  () => props.expanded,
  (val) => {
    localExpanded.value = val
  }
)

watch(localExpanded, (val) => {
  if (val) {
    clampAt(text.value.length)
  } else {
    update()
  }
  if (props.expanded !== val) {
    emit('update:expanded', val)
  }
})
watch(
  isClamped,
  (val) => {
    nextTick(() => emit('clampchange', val))
  },
  {
    immediate: true,
  }
)

onMounted(() => {
  init()
  watch(
    () =>
      [
        props.maxLines,
        props.maxHeight,
        props.ellipsis,
        isClamped.value,
        props.location,
      ].join(),
    update
  )
  watch(() => [props.tag, text.value, props.autoresize].join(), init)
}),
  onUpdated(() => {
    text.value = getText()
    applyChange()
  }),
  onBeforeUnmount(() => {
    cleanUp()
  })

function init() {
  const contents = slots.default!()
  if (!contents) {
    return
  }

  offset.value = text.value.length

  cleanUp()

  if (props.autoresize) {
    addResizeListener(clampRef.value!, update)
    unregisterResizeCallback.value = () => {
      removeResizeListener(clampRef.value!, update)
    }
  }
  update()
}
function update() {
  if (localExpanded.value) {
    return
  }
  applyChange()
  if (isOverflow() || isClamped.value) {
    search()
  }
}
function expand() {
  localExpanded.value = true
}
function collapse() {
  localExpanded.value = false
}
function toggle() {
  localExpanded.value = !localExpanded.value
}
function getLines() {
  console.log(contentRef.value)
  return Object.keys(
    Array.prototype.slice
      .call(contentRef.value!.getClientRects())
      .reduce((prev, { top, bottom }) => {
        const key = `${top}/${bottom}`
        if (!prev[key]) {
          prev[key] = true
        }
        return prev
      }, {})
  ).length
}
function isOverflow() {
  if (!props.maxLines && !props.maxHeight) {
    return false
  }

  if (props.maxLines) {
    if (getLines() > props.maxLines) {
      return true
    }
  }

  if (props.maxHeight) {
    if (clampRef.value!.scrollHeight > clampRef.value!.offsetHeight) {
      return true
    }
  }
  return false
}
function getText(): string {
  // Look for the first non-empty text node
  const [content] = (slots.default!() as any[] || []).filter(
    (node: any) => !node.tag && !node.isComment
  )
  console.log(content)
  return content ? content.children.trim() : ''
}

function moveEdge(steps: number) {
  clampAt(offset.value + steps)
}
function clampAt(offsetVal: number) {
  offset.value = offsetVal
  applyChange()
}
function applyChange() {
  textRef.value!.textContent = realText.value
}
function stepToFit() {
  fill()
  clamp()
}
function fill() {
  while (
    (!isOverflow() || getLines() < 2) &&
    offset.value < text.value.length
  ) {
    moveEdge(1)
  }
}
function clamp() {
  while (isOverflow() && getLines() > 1 && offset.value > 0) {
    moveEdge(-1)
  }
}
function search(...range: number[]) {
  const [from = 0, to = offset.value] = range
  if (to - from <= 3) {
    stepToFit()
    return
  }
  const target = Math.floor((to + from) / 2)
  clampAt(target)
  if (isOverflow()) {
    search(from, target)
  } else {
    search(target, to)
  }
}
function cleanUp() {
  if (unregisterResizeCallback.value) {
    unregisterResizeCallback.value()
  }
}

const scope = reactive({
  expand,
  collapse,
  toggle,
  clamped: isClamped.value,
  expanded: localExpanded.value,
})
</script>

<template>
  <component
    ref="clampRef"
    :is="tag"
    :style="{ maxHeight: realMaxHeight, overflow: 'hidden' }"
  >
    <span ref="contentRef" :style="{ boxShadow: 'transparent 0 0' }">
      <slot name="before" v-bind="scope" />
      <span ref="textRef" :aria-label="text.trim()">{{ realText }}</span>
      <slot name="after" v-bind="scope" />
    </span>
  </component>
</template>

<style scoped></style>
