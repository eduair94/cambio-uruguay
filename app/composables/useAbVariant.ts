import { abAssignments, type AbArm, type AbTestId } from '~/utils/abTests'

/**
 * El brazo de un experimento A/B para lo que se pinta SÓLO en el navegador (dentro de
 * `ClientOnly`). `null` en el servidor y hasta montar, y para quien no tiene marca (programas,
 * almacenamiento bloqueado, fuera de fecha): tratarlo como control. Lo que va en el HTML del
 * servidor NO usa esto: se muestra u oculta por CSS con `html[data-ab-<id>="b"]`, para no mover
 * una página ya pintada.
 */
export function useAbVariant(id: AbTestId): Ref<AbArm | null> {
  const arm = ref<AbArm | null>(null)
  onMounted(() => {
    arm.value = abAssignments()[id] ?? null
  })
  return arm
}
