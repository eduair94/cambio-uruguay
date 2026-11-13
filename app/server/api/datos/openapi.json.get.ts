import { openDataOpenApi } from '../../../utils/openData'
import { openDataHeaders } from '../../utils/openData'

export default defineEventHandler(event => {
  openDataHeaders(event, 86_400)
  return openDataOpenApi()
})
