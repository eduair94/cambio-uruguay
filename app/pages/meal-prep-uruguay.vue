<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero on-dark mb-8 pa-5 pa-md-8 rounded-lg">
      <p class="hero-eyebrow">Meal prep · precios del SIPC {{ priceDayLabel }}</p>
      <h1 class="hero-title">Viandas para toda la semana: cociná un día, comé siete</h1>
      <p class="hero-lead">
        Decís cuánto medís, cuánto pesás y qué tenés en la cocina. La página arma
        <strong>desayuno, almuerzo, merienda y cena de lunes a domingo</strong> con cuatro platos
        que se cocinan el domingo, se guardan en tuppers en la heladera o el freezer y se
        recalientan en el microondas. Con la lista de compras valuada con los
        <strong>precios de supermercado que el sitio mide todos los días</strong>.
      </p>
      <p class="hero-lead hero-lead--small">
        Ningún tupper se asigna a un día en que ya no sería seguro comerlo: cada receta dice cuántos
        días aguanta en la heladera y si se puede freezar, y el plan lo cumple o pone una receta de
        10 minutos en su lugar.
      </p>
    </header>

    <!-- ── Formulario ─────────────────────────────────────────────────── -->
    <VCard class="pa-4 pa-sm-6 mb-6">
      <div class="mp-section-title">Tus datos</div>
      <VRow class="mb-1">
        <VCol cols="12" sm="6" md="3">
          <VBtnToggle
            v-model="profile.sex"
            mandatory
            divided
            variant="outlined"
            density="comfortable"
            class="w-100"
            data-testid="mp-sex"
          >
            <VBtn value="f" class="flex-grow-1">Mujer</VBtn>
            <VBtn value="m" class="flex-grow-1">Hombre</VBtn>
          </VBtnToggle>
        </VCol>
        <VCol cols="6" sm="3" md="2">
          <VTextField
            v-model.number="profile.age"
            type="number"
            :min="AGE_MIN"
            :max="AGE_MAX"
            label="Edad"
            suffix="años"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="mp-age"
          />
        </VCol>
        <VCol cols="6" sm="3" md="2">
          <VTextField
            v-model.number="profile.heightCm"
            type="number"
            :min="HEIGHT_MIN"
            :max="HEIGHT_MAX"
            label="Altura"
            suffix="cm"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="mp-height"
          />
        </VCol>
        <VCol cols="6" sm="3" md="2">
          <VTextField
            v-model.number="profile.weightKg"
            type="number"
            :min="WEIGHT_MIN"
            :max="WEIGHT_MAX"
            step="0.5"
            label="Peso"
            suffix="kg"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="mp-weight"
          />
        </VCol>
        <VCol cols="6" sm="3" md="3">
          <VSelect
            v-model="options.people"
            :items="peopleItems"
            label="Para cuántas personas"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="7">
          <VSelect
            v-model="profile.activity"
            :items="activityItems"
            label="Actividad física"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="5">
          <VSelect
            v-model="profile.goal"
            :items="goalItems"
            label="Objetivo"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="mp-goal"
          />
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12" md="6">
          <div class="mp-section-title mt-2">Tu cocina</div>
          <VChipGroup
            :model-value="options.appliances"
            multiple
            column
            selected-class="text-primary"
            @update:model-value="setAppliances"
          >
            <VChip
              v-for="appliance in applianceItems"
              :key="appliance.id"
              :value="appliance.id"
              filter
              variant="outlined"
            >
              {{ appliance.label }}
            </VChip>
          </VChipGroup>
          <VSwitch
            :model-value="options.hasFreezer"
            color="primary"
            density="compact"
            hide-details
            label="Tengo freezer (o congelador en la heladera)"
            @update:model-value="v => (options.hasFreezer = v === true)"
          />
        </VCol>
        <VCol cols="12" md="6">
          <div class="mp-section-title mt-2">Restricciones</div>
          <VChipGroup
            :model-value="options.restrictions"
            multiple
            column
            selected-class="text-primary"
            @update:model-value="setRestrictions"
          >
            <VChip
              v-for="restriction in restrictionItems"
              :key="restriction.id"
              :value="restriction.id"
              filter
              variant="outlined"
            >
              {{ restriction.label }}
            </VChip>
          </VChipGroup>
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap ga-2 mt-4">
        <VBtn
          color="primary"
          variant="flat"
          prepend-icon="mdi-dice-multiple-outline"
          data-testid="mp-reshuffle"
          @click="reshuffle"
        >
          Otra combinación
        </VBtn>
        <VBtn variant="text" prepend-icon="mdi-restore" @click="resetAll">Volver al ejemplo</VBtn>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Lo que cargás queda guardado en este navegador, nada más. Combinación
        <strong>#{{ plan.seed }}</strong
        >.
      </p>
    </VCard>

    <!-- ── Tus números ───────────────────────────────────────────────── -->
    <VCard class="pa-4 pa-sm-6 mb-6">
      <h2 class="text-h5 font-weight-bold mb-1">Tus números</h2>
      <p class="text-body-2 text-medium-emphasis mp-para">
        Mifflin–St Jeor para el metabolismo basal, factor de actividad para el gasto total, y el
        objetivo que elegiste. Son fórmulas poblacionales (±10 % para la mitad de la gente), no una
        medición tuya.
      </p>
      <div class="mp-stats">
        <div class="mp-stat">
          <span class="mp-stat-label">IMC</span>
          <span class="mp-stat-value">{{ n1(targets.bmi) }}</span>
          <span class="mp-stat-note">{{ targets.bmiLabel }}</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Metabolismo basal</span>
          <span class="mp-stat-value">{{ n0(targets.bmr) }}</span>
          <span class="mp-stat-note">kcal en reposo</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Gasto total</span>
          <span class="mp-stat-value">{{ n0(targets.tdee) }}</span>
          <span class="mp-stat-note">kcal por día</span>
        </div>
        <div class="mp-stat mp-stat--primary">
          <span class="mp-stat-label">Objetivo</span>
          <span class="mp-stat-value" data-testid="mp-kcal">{{ n0(targets.kcal) }}</span>
          <span class="mp-stat-note">kcal por día</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Proteína</span>
          <span class="mp-stat-value">{{ targets.protein }} g</span>
          <span class="mp-stat-note">{{ pct(targets.proteinShare) }} de las kcal</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Grasa</span>
          <span class="mp-stat-value">{{ targets.fat }} g</span>
          <span class="mp-stat-note">{{ pct(targets.fatShare) }}</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Carbohidratos</span>
          <span class="mp-stat-value">{{ targets.carbs }} g</span>
          <span class="mp-stat-note">{{ pct(targets.carbsShare) }}</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Fibra</span>
          <span class="mp-stat-value">{{ targets.fiber }} g</span>
          <span class="mp-stat-note">por día</span>
        </div>
      </div>

      <VAlert
        v-if="targets.flooredAtMinimum"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-alert-outline"
      >
        <span class="text-body-2">
          El objetivo "bajar" daba menos de {{ n0(targets.kcal) }} kcal y el plan se frena ahí: por
          debajo de eso no es una dieta balanceada, y no es algo que armar con una página.
        </span>
      </VAlert>

      <div class="mp-adherence mt-4">
        <p class="text-body-2 mb-2">
          <strong>Lo que el plan te da, promedio de la semana:</strong>
          {{ n0(plan.weekAverage.kcal) }} kcal ({{ pct(plan.adherence.kcal) }} del objetivo),
          {{ plan.weekAverage.protein }} g de proteína ({{ pct(plan.adherence.protein) }}),
          {{ plan.weekAverage.fiber }} g de fibra ({{ pct(plan.adherence.fiber) }}).
        </p>
        <VProgressLinear
          :model-value="Math.min(100, plan.adherence.kcal * 100)"
          :color="adherenceColor(plan.adherence.kcal)"
          height="8"
          rounded
          class="mb-1"
        />
      </div>

      <VAlert
        v-for="(adjustment, i) in plan.adjustments"
        :key="`adj-${i}`"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-3"
        icon="mdi-plus-circle-outline"
      >
        <span class="text-body-2">{{ adjustment }}</span>
      </VAlert>
      <VAlert
        v-for="(warning, i) in plan.warnings"
        :key="`warn-${i}`"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-3"
        icon="mdi-information-outline"
      >
        <span class="text-body-2">{{ warning }}</span>
      </VAlert>
    </VCard>

    <!-- ── Plan semanal ──────────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-1">La semana</h2>
      <div class="text-body-2 text-medium-emphasis mp-para">
        El día de cocina es el <strong>domingo</strong>. Cada celda dice de dónde sale el plato:
        <VChip size="x-small" color="success" variant="tonal">heladera</VChip> hasta el día que la
        receta aguanta, <VChip size="x-small" color="info" variant="tonal">freezer</VChip> después
        (se pasa a la heladera la noche anterior), o
        <VChip size="x-small" color="warning" variant="tonal">se hace ese día</VChip> cuando ninguna
        de las dos es segura.
      </div>
      <div class="table-scroll">
        <VTable density="comfortable" class="cu-mobile-cards cu-roomy" data-testid="mp-plan-table">
          <thead>
            <tr>
              <th>Día</th>
              <th v-for="slot in SLOTS" :key="slot">{{ slotLabel[slot] }}</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in plan.days" :key="day.day">
              <td>
                <strong>{{ dayName(day.day) }}</strong>
              </td>
              <td
                v-for="slot in SLOTS"
                :key="slot"
                :data-label="slotLabel[slot]"
                class="cu-cell-prose"
              >
                <template v-if="mealAt(day, slot)">
                  <div class="mp-cell-name">{{ mealAt(day, slot)!.recipeName }}</div>
                  <div class="mp-cell-meta">
                    <VChip
                      size="x-small"
                      :color="storageChip(mealAt(day, slot)!).color"
                      variant="tonal"
                    >
                      {{ storageChip(mealAt(day, slot)!).label }}
                    </VChip>
                    <span class="text-caption text-medium-emphasis">
                      {{ n0(mealAt(day, slot)!.nutrients.kcal) }} kcal ·
                      {{ Math.round(mealAt(day, slot)!.nutrients.protein) }} g prot
                    </span>
                  </div>
                  <div
                    v-for="boost in mealAt(day, slot)!.boosts ?? []"
                    :key="boost.ingredientId"
                    class="text-caption mp-boost"
                  >
                    + {{ boost.grams }} g de {{ boost.name.toLowerCase() }}
                  </div>
                </template>
                <span v-else class="text-caption text-medium-emphasis">sin receta posible</span>
              </td>
              <td class="text-right" data-label="Total">
                <strong>{{ n0(day.totals.kcal) }} kcal</strong>
                <span class="d-block text-caption text-medium-emphasis">
                  {{ day.totals.protein }} g prot · {{ day.totals.carbs }} g carb ·
                  {{ day.totals.fat }} g grasa · {{ day.totals.fiber }} g fibra
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption text-medium-emphasis mt-2 mb-0">
        Los cuatro principales de la semana:
        <span v-for="(main, i) in plan.mains" :key="main.recipeId">
          <strong>{{ main.name }}</strong> ({{ main.portions }} porciones){{
            i < plan.mains.length - 1 ? ', ' : '.'
          }}
        </span>
      </p>
    </section>

    <!-- ── Día de cocina ─────────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-1">El día de cocina</h2>
      <p class="text-body-2 text-medium-emphasis mp-para">
        <strong>{{ plan.cook.tasks.length }} recetas</strong> en tandas,
        <strong>{{ plan.cook.containers }} tuppers</strong>
        <template v-if="plan.cook.freezerContainers">
          ({{ plan.cook.freezerContainers }} al freezer)</template
        >, unas <strong>{{ hoursLabel(plan.cook.estimatedMinutes) }}</strong> con las cosas
        superpuestas: mientras un guiso hierve, el airfryer hace las milanesas. El orden de abajo es
        el orden de trabajo: primero lo que se cocina solo, después el airfryer, al final lo corto.
      </p>
      <VExpansionPanels variant="accordion" class="mb-3">
        <VExpansionPanel v-for="(task, i) in plan.cook.tasks" :key="task.recipeId">
          <VExpansionPanelTitle>
            <div class="mp-task-title">
              <span class="mp-task-index">{{ i + 1 }}</span>
              <div>
                <div class="font-weight-bold">{{ task.name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ portionsLabel(task.portions) }} · {{ task.prepMinutes }} min de manos +
                  {{ task.cookMinutes }} min de cocción ·
                  {{ task.appliances.map(a => applianceLabel[a]).join(' + ') }}
                </div>
              </div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <VRow>
              <VCol cols="12" md="5">
                <div class="mp-sub">Por porción ({{ task.nutrients.kcal }} kcal)</div>
                <ul class="mp-list">
                  <li v-for="ing in task.ingredients" :key="ing.id">
                    {{ gramsLabel(ing.grams) }} de {{ ing.name.toLowerCase() }}
                  </li>
                </ul>
                <p class="text-caption text-medium-emphasis mb-0">
                  Para {{ portionsLabel(task.portions) }} multiplicá por {{ task.portions }}.
                  Proteína {{ task.nutrients.protein }} g · carbohidratos
                  {{ task.nutrients.carbs }} g · grasa {{ task.nutrients.fat }} g · fibra
                  {{ task.nutrients.fiber }} g.
                </p>
              </VCol>
              <VCol cols="12" md="7">
                <div class="mp-sub">Pasos</div>
                <ol class="mp-list">
                  <li v-for="(step, s) in task.steps" :key="s">{{ step }}</li>
                </ol>
                <div class="mp-label">
                  <div class="mp-label-title">
                    <VIcon size="small" icon="mdi-tag-outline" /> Etiqueta del tupper
                  </div>
                  <div class="text-body-2">
                    <strong>{{ task.name }}</strong> · {{ gramsLabel(taskGrams(task)) }} crudos por
                    tupper · {{ task.nutrients.kcal }} kcal
                  </div>
                  <div v-if="task.fridgePortions" class="text-body-2">
                    {{ task.fridgePortions }} en heladera: comer hasta el
                    <strong>{{ dayName(task.fridgeDays).toLowerCase() }}</strong>
                    ({{ task.fridgeDays }} días).
                  </div>
                  <div v-if="task.freezerPortions" class="text-body-2">
                    {{ task.freezerPortions }} al freezer: pasar a la heladera la noche anterior.
                  </div>
                  <div class="text-body-2">
                    <strong>{{ task.cold ? 'Se come frío' : 'Recalentar' }}:</strong>
                    {{ task.reheat }}.
                  </div>
                </div>
              </VCol>
            </VRow>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
      <p class="text-caption text-medium-emphasis mb-0">
        Los desayunos y meriendas que no están acá se arman cada día en menos de 5 minutos; su ficha
        está más abajo, en "Todas las recetas del plan".
      </p>
    </section>

    <!-- ── Lista de compras ──────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-1">La lista de compras</h2>
      <div class="text-body-2 text-medium-emphasis mp-para">
        Cantidades con la merma incluida (la banana se compra con cáscara, la pata-muslo con hueso)
        y redondeadas al paquete: lo que sobra sirve la semana que viene. La despensa (aceite, sal,
        especias, cocoa) se cobra por lo que se usa, porque no se compra entera cada semana. Los
        precios marcados <VChip size="x-small" color="success" variant="tonal">SIPC</VChip> son la
        mediana nacional del relevamiento oficial
        <template v-if="plan.shopping.priceDay">
          del {{ dateLabel(plan.shopping.priceDay) }}</template
        >; los marcados <VChip size="x-small" variant="tonal">estimado</VChip> no están en ese
        catálogo (leche, legumbres, cebolla…) y son un precio de góndola relevado a mano, con fecha.
      </div>

      <div class="mp-stats mp-stats--money mb-4">
        <div class="mp-stat mp-stat--primary">
          <span class="mp-stat-label">En la góndola</span>
          <span class="mp-stat-value" data-testid="mp-gondola">{{
            money(plan.shopping.gondolaTotal)
          }}</span>
          <span class="mp-stat-note"
            >paquetes enteros, {{ plan.options.people }} persona{{
              plan.options.people === 1 ? '' : 's'
            }}</span
          >
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Lo que se come</span>
          <span class="mp-stat-value">{{ money(plan.shopping.usedTotal) }}</span>
          <span class="mp-stat-note"
            >{{ money(plan.shopping.gondolaTotal - plan.shopping.usedTotal) }} sobran para la semana
            que viene</span
          >
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Por día</span>
          <span class="mp-stat-value">{{ money(plan.shopping.perDay) }}</span>
          <span class="mp-stat-note">por persona, las 4 comidas</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Por comida</span>
          <span class="mp-stat-value">{{ money(plan.shopping.perMeal) }}</span>
          <span class="mp-stat-note">por persona</span>
        </div>
        <div class="mp-stat">
          <span class="mp-stat-label">Medido en el SIPC</span>
          <span class="mp-stat-value">{{ pct(measuredShare) }}</span>
          <span class="mp-stat-note">del costo; el resto es estimado</span>
        </div>
      </div>

      <div v-for="group in shoppingGroups" :key="group.id" class="mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">
          {{ group.label }}
          <span class="text-medium-emphasis font-weight-regular">· {{ money(group.total) }}</span>
        </h3>
        <div class="table-scroll">
          <VTable density="compact" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-right">Comprar</th>
                <th class="text-right">Paquetes</th>
                <th class="text-right">Precio</th>
                <th class="text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in group.lines" :key="line.ingredientId">
                <td>
                  <strong>{{ line.name }}</strong>
                  <span v-if="line.note" class="d-block text-caption text-medium-emphasis">{{
                    line.note
                  }}</span>
                </td>
                <td class="text-right" data-label="Comprar">{{ gramsLabel(line.buyGrams) }}</td>
                <td class="text-right" data-label="Paquetes">{{ packsLabel(line) }}</td>
                <td class="text-right" data-label="Precio">
                  {{ priceLabel(line) }}
                  <VChip
                    size="x-small"
                    :color="line.source === 'sipc' ? 'success' : undefined"
                    variant="tonal"
                    class="ml-1"
                    :title="line.source === 'sipc' ? line.articleName : `estimado ${line.asOf}`"
                  >
                    {{ line.source === 'sipc' ? 'SIPC' : 'estimado' }}
                  </VChip>
                </td>
                <td class="text-right" data-label="Costo">{{ money(line.gondolaCost) }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </div>
    </section>

    <!-- ── Recetas ───────────────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-1">Todas las recetas del plan</h2>
      <p class="text-body-2 text-medium-emphasis mp-para">
        Ingredientes por porción ya escalados a tus kcal. Los pesos son crudos, que es lo que se
        compra y se pesa.
      </p>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="card in recipeCards" :key="card.recipe.id">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-bold">{{ card.recipe.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ slotOfRecipe(card.recipe) }} · {{ card.nutrients.kcal }} kcal ·
                {{ card.nutrients.protein }} g proteína ·
                {{ card.recipe.prepMinutes + card.recipe.cookMinutes }} min
              </div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p v-if="card.recipe.why" class="text-body-2 mb-3">{{ card.recipe.why }}</p>
            <VRow>
              <VCol cols="12" md="5">
                <div class="mp-sub">Ingredientes (1 porción)</div>
                <ul class="mp-list">
                  <li v-for="ing in card.ingredients" :key="ing.id">
                    {{ gramsLabel(ing.grams) }} de {{ ing.name.toLowerCase() }}
                  </li>
                </ul>
              </VCol>
              <VCol cols="12" md="7">
                <div class="mp-sub">Pasos</div>
                <ol class="mp-list">
                  <li v-for="(step, s) in card.recipe.steps" :key="s">{{ step }}</li>
                </ol>
                <p class="text-body-2 mb-0">
                  <strong>Conservación:</strong>
                  <template v-if="card.recipe.batch">
                    {{ card.recipe.storage.fridgeDays }} días en heladera{{
                      card.recipe.storage.freezable ? ', se freeza' : ', no se freeza'
                    }}. {{ card.recipe.storage.reheat }}.
                  </template>
                  <template v-else>{{ card.recipe.storage.reheat }}.</template>
                </p>
              </VCol>
            </VRow>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- ── Seguridad alimentaria ─────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-1">Para que no se eche a perder</h2>
      <p class="text-body-2 text-medium-emphasis mp-para">
        El plan cumple estas reglas al asignar cada tupper. Lo que queda de tu lado es ejecutarlas.
      </p>
      <VRow>
        <VCol v-for="rule in SAFETY_RULES" :key="rule.title" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ rule.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ rule.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ── Cómo se calcula ───────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo se calcula</h2>
      <ul class="mp-list text-body-2">
        <li>
          <strong>Calorías:</strong> metabolismo basal por Mifflin–St Jeor (10·kg + 6,25·cm −
          5·edad, +5 hombres / −161 mujeres) por el factor de actividad (1,2 a 1,9). Bajar = −15 %
          con piso de 1.200 kcal (mujeres) / 1.500 (hombres); subir = +10 %.
        </li>
        <li>
          <strong>Macros:</strong> proteína 1,6 g por kilo (1,8 si el objetivo es bajar), nunca más
          del 30 % de las kcal; grasa 28 %; carbohidratos el resto; fibra 25/30 g.
        </li>
        <li>
          <strong>Reparto:</strong> desayuno 22 %, almuerzo 35 %, merienda 13 %, cena 30 %. Cada
          plato se escala a su turno con una sola medida por plato, porque los tuppers se llenan
          iguales; por eso el día queda ±10 % y se muestra el número real.
        </li>
        <li>
          <strong>Composición:</strong> tablas estándar (USDA / SARA) por 100 g crudos. Las pérdidas
          de cocción no se descuentan: el guiso pesa menos cocido, pero las calorías son las mismas.
        </li>
        <li>
          <strong>Precios:</strong> mediana nacional de todos los artículos del SIPC que matchean el
          ingrediente (cinco marcas de arroz → un precio de arroz), pasada a pesos por gramo con la
          presentación de cada uno. Lo que no está en el SIPC se estima y se marca.
        </li>
        <li>
          <strong>Determinismo:</strong> mismos datos, mismo plan. "Otra combinación" cambia la
          semilla, nada más. No hay inteligencia artificial en ningún paso.
        </li>
      </ul>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Seguí con el detalle</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-stethoscope">
      <span class="text-body-2">
        Esto es aritmética sobre fórmulas poblacionales y tablas de composición, no un plan
        nutricional. No sirve para embarazo, lactancia, menores de 18, diabetes, enfermedad renal ni
        trastornos alimentarios: para eso, una nutricionista. Y no reemplaza tus sentidos: si un
        tupper huele mal, se tira.
      </span>
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import { formatUYU } from '~/utils/format'
import {
  ACTIVITY_LABEL,
  AGE_MAX,
  AGE_MIN,
  GOAL_LABEL,
  HEIGHT_MAX,
  HEIGHT_MIN,
  WEIGHT_MAX,
  WEIGHT_MIN,
} from '~/utils/mealprep/nutrition'
import {
  buildWeekPlan,
  DEFAULT_OPTIONS,
  DEFAULT_PROFILE,
  SLOTS,
  type CookTask,
  type DayPlan,
  type PlannedMeal,
  type ShoppingLine,
} from '~/utils/mealprep/planner'
import { estimatedPrices } from '~/utils/mealprep/pricing'
import { recipeNutrients, roundNutrients, scaleNutrients } from '~/utils/mealprep/recipeMath'
import { ingredientById } from '~/utils/mealprep/ingredients'
import { recipeById } from '~/utils/mealprep/recipes'
import { SAFETY_RULES, STORAGE_LABEL, type Storage } from '~/utils/mealprep/safety'
import type {
  Activity,
  Appliance,
  Goal,
  IngredientCategory,
  MealSlot,
  PlanOptions,
  Profile,
  Recipe,
  Restriction,
} from '~/utils/mealprep/types'
import type { MealprepPricesResponse } from '~/server/api/mealprep-prices.get'

const localePath = useLocalePath()

// Server-rendered con el perfil de ejemplo: el plan ES la página. Los precios
// vienen de la ruta que proyecta el catálogo del SIPC; si no contesta, estimados.
const { data: pricesData } = await useFetch<MealprepPricesResponse>('/api/mealprep-prices', {
  key: 'mealprep-prices',
  default: () => ({ day: null, prices: estimatedPrices() }),
})

const STORAGE_KEY = 'cu_mealprep_v1'

const profile = reactive<Profile>({ ...DEFAULT_PROFILE })
const options = reactive<PlanOptions>({
  ...DEFAULT_OPTIONS,
  restrictions: [...DEFAULT_OPTIONS.restrictions],
  appliances: [...DEFAULT_OPTIONS.appliances],
})

const APPLIANCES: Appliance[] = ['airfryer', 'microondas', 'anafe', 'horno']
const RESTRICTIONS: Restriction[] = ['vegetariano', 'sin-pescado', 'sin-carne-roja', 'sin-lactosa']

const applianceLabel: Record<Appliance, string> = {
  airfryer: 'Airfryer',
  microondas: 'Microondas',
  anafe: 'Anafe / cocina',
  horno: 'Horno',
  'sin-coccion': 'Sin cocción',
}
const applianceItems = APPLIANCES.map(id => ({ id, label: applianceLabel[id] }))
const restrictionItems: Array<{ id: Restriction; label: string }> = [
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'sin-pescado', label: 'Sin pescado' },
  { id: 'sin-carne-roja', label: 'Sin carne roja' },
  { id: 'sin-lactosa', label: 'Sin lactosa' },
]
const activityItems = (Object.keys(ACTIVITY_LABEL) as Activity[]).map(value => ({
  value,
  title: ACTIVITY_LABEL[value],
}))
const goalItems = (Object.keys(GOAL_LABEL) as Goal[]).map(value => ({
  value,
  title: GOAL_LABEL[value],
}))
const peopleItems = [1, 2, 3, 4, 5, 6].map(value => ({
  value,
  title: value === 1 ? '1 persona' : `${value} personas`,
}))

function setAppliances(value: unknown) {
  const next = Array.isArray(value)
    ? value.filter((v): v is Appliance => APPLIANCES.includes(v))
    : []
  options.appliances = next
}
function setRestrictions(value: unknown) {
  const next = Array.isArray(value)
    ? value.filter((v): v is Restriction => RESTRICTIONS.includes(v))
    : []
  options.restrictions = next
}

const plan = computed(() => buildWeekPlan(profile, options, pricesData.value.prices))
const targets = computed(() => plan.value.targets)

// Persistencia: sólo después de haber cargado, porque los controles de Vuetify
// emiten al montar y pisarían lo guardado con los defaults.
let loaded = false
function restore() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { profile?: Partial<Profile>; options?: Partial<PlanOptions> }
    if (saved.profile) {
      if (saved.profile.sex === 'f' || saved.profile.sex === 'm') profile.sex = saved.profile.sex
      for (const key of ['age', 'heightCm', 'weightKg'] as const) {
        const v = saved.profile[key]
        if (typeof v === 'number' && Number.isFinite(v)) profile[key] = v
      }
      if (saved.profile.activity && saved.profile.activity in ACTIVITY_LABEL)
        profile.activity = saved.profile.activity
      if (saved.profile.goal && saved.profile.goal in GOAL_LABEL) profile.goal = saved.profile.goal
    }
    if (saved.options) {
      if (typeof saved.options.people === 'number') options.people = saved.options.people
      if (typeof saved.options.hasFreezer === 'boolean')
        options.hasFreezer = saved.options.hasFreezer
      if (typeof saved.options.seed === 'number') options.seed = saved.options.seed
      setAppliances(saved.options.appliances)
      setRestrictions(saved.options.restrictions)
    }
  } catch {
    /* localStorage bloqueado o JSON roto: se sigue con el ejemplo */
  }
}
function persist() {
  if (!loaded || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, options }))
  } catch {
    /* sin persistencia, sin drama */
  }
}
onMounted(() => {
  restore()
  loaded = true
})
watch([profile, options], persist, { deep: true })

function reshuffle() {
  options.seed = (options.seed % 9999) + 1
}
function resetAll() {
  Object.assign(profile, DEFAULT_PROFILE)
  Object.assign(options, {
    ...DEFAULT_OPTIONS,
    restrictions: [...DEFAULT_OPTIONS.restrictions],
    appliances: [...DEFAULT_OPTIONS.appliances],
  })
}

// ── Presentación ──────────────────────────────────────────────────────────
const slotLabel: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
}
const storageColor: Record<Storage, string> = {
  heladera: 'success',
  freezer: 'info',
  fresco: 'warning',
}
/** Un desayuno o una merienda "fresco" se arma en el momento: no es una alerta, es lo normal. */
const storageChip = (meal: PlannedMeal): { label: string; color: string | undefined } => {
  if (meal.storage === 'fresco' && meal.slot !== 'almuerzo' && meal.slot !== 'cena') {
    return { label: 'Al momento', color: undefined }
  }
  return { label: STORAGE_LABEL[meal.storage], color: storageColor[meal.storage] }
}
const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]
const dayName = (day: number) => DAY_NAMES[day] ?? `Día ${day}`
const mealAt = (day: DayPlan, slot: MealSlot): PlannedMeal | undefined =>
  day.meals.find(m => m.slot === slot)

const n0 = (v: number) => Math.round(v).toLocaleString('es-UY')
const n1 = (v: number) => v.toLocaleString('es-UY', { maximumFractionDigits: 1 })
const pct = (v: number) => `${Math.round(v * 100)} %`
const money = (v: number) => formatUYU(v, 0)
const gramsLabel = (g: number) =>
  g >= 1000
    ? `${(g / 1000).toLocaleString('es-UY', { maximumFractionDigits: 2 })} kg`
    : `${Math.round(g)} g`
const packsLabel = (line: ShoppingLine) => {
  if (line.pantry) return 'de la despensa'
  if (line.byWeight) return 'al peso'
  return `${line.packs} × ${line.packLabel}`
}
/** Al peso se muestra el kilo; en paquete, el precio del paquete. */
const priceLabel = (line: ShoppingLine) =>
  line.byWeight ? `${money(line.pricePerPack * 10)}/kg` : money(line.pricePerPack)
const portionsLabel = (n: number) => (n === 1 ? '1 porción' : `${n} porciones`)
const taskGrams = (task: CookTask) => task.ingredients.reduce((s, i) => s + i.grams, 0)
const hoursLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}
const adherenceColor = (share: number) =>
  share >= 0.92 && share <= 1.08 ? 'success' : share >= 0.85 && share <= 1.15 ? 'warning' : 'error'

const priceDayLabel = computed(() =>
  pricesData.value.day ? `del ${dateLabel(pricesData.value.day)}` : '(precios estimados)'
)
const measuredShare = computed(() =>
  plan.value.shopping.usedTotal
    ? plan.value.shopping.measuredTotal / plan.value.shopping.usedTotal
    : 0
)

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  carniceria: 'Carnicería y pescadería',
  verduleria: 'Verdulería',
  lacteos: 'Lácteos, huevos y fiambre',
  almacen: 'Almacén',
  despensa: 'Despensa (se compra una vez)',
}
const shoppingGroups = computed(() => {
  const groups = new Map<
    string,
    { id: string; label: string; lines: ShoppingLine[]; total: number }
  >()
  for (const line of plan.value.shopping.lines) {
    const id = line.pantry ? 'despensa' : line.category
    const group = groups.get(id) ?? {
      id,
      label: CATEGORY_LABEL[id as IngredientCategory],
      lines: [],
      total: 0,
    }
    group.lines.push(line)
    group.total += line.gondolaCost
    groups.set(id, group)
  }
  return [...groups.values()]
})

const recipeCards = computed(() => {
  const seen = new Map<string, number>()
  for (const day of plan.value.days) {
    for (const meal of day.meals) if (!seen.has(meal.recipeId)) seen.set(meal.recipeId, meal.factor)
  }
  return [...seen.entries()].map(([id, factor]) => {
    const recipe = recipeById(id)
    return {
      recipe,
      factor,
      nutrients: roundNutrients(scaleNutrients(recipeNutrients(recipe), factor)),
      ingredients: recipe.ingredients.map(line => ({
        id: line.id,
        name: ingredientById(line.id).name,
        grams: Math.round(line.grams * factor),
      })),
    }
  })
})
const slotOfRecipe = (recipe: Recipe) =>
  recipe.slot === 'principal' ? 'Almuerzo o cena' : slotLabel[recipe.slot]

const relatedLinks = [
  {
    to: '/precios-de-supermercado-uruguay',
    title: 'Precios de supermercado',
    body: 'De dónde salen los precios de la lista: 213 artículos del SIPC, medidos todos los días.',
  },
  {
    to: '/herramientas/costo-de-vida',
    title: 'Costo de vida',
    body: 'Cuánto sale vivir en Uruguay, con la comida medida al lado de la estimación.',
  },
  {
    to: '/plan-de-vida-uruguay',
    title: 'Cómo distribuir tu sueldo',
    body: 'En qué orden va cada peso: lo esencial, la deuda cara, el colchón y el excedente.',
  },
  {
    to: '/equipar-casa-uruguay',
    title: 'Equipar una casa vacía',
    body: 'Qué sale llenar una vivienda, del airfryer al colchón, con precios vivos.',
  },
]

const faq: FaqItem[] = [
  {
    id: 'cuanto-dura',
    question: '¿Cuántos días dura la comida cocinada en la heladera?',
    answer:
      'Tres días para comidas cocidas a 4 °C o menos (la USDA dice 3–4; el plan toma 3). Arroz cocido y pescado, dos. Ensaladas sin aderezar, dos o tres. El plan no asigna ningún tupper de heladera más allá del límite de su receta: lo que se come del día 4 en adelante sale del freezer o se cocina ese día.',
  },
  {
    id: 'sin-freezer',
    question: 'No tengo freezer. ¿Sirve igual?',
    answer:
      'Sí, con una diferencia: los tuppers de heladera llegan hasta el miércoles. De jueves a domingo el plan pone recetas de 10 a 20 minutos que se hacen ese día (fideos con atún, omelette, sándwich de atún). Desmarcá "Tengo freezer" y lo ves.',
  },
  {
    id: 'que-se-puede-freezar',
    question: '¿Qué se puede freezar y qué no?',
    answer:
      'Guisos, salsas con carne, albóndigas, pollo desmenuzado, lentejas, polenta, milanesas cocidas, arroz y pasta en salsa: bien. Papa hervida o en tortilla, ensaladas, huevo duro y lechuga: no, cambian de textura o se aguan. Cada receta lo declara y el plan deja las no congelables en los primeros tres días.',
  },
  {
    id: 'recalentar',
    question: '¿Cómo recaliento en el microondas para que quede bien?',
    answer:
      'Destapado o con la tapa apoyada sin cerrar, a potencia máxima, revolviendo a la mitad y dejando reposar un minuto: el borde hierve antes que el centro, y el centro tiene que llegar a 74 °C. Guisos y arroz, 3 a 4 minutos; milanesas, 2 minutos y si querés crocante 3 más en el airfryer. Lo recalentado no se vuelve a guardar.',
  },
  {
    id: 'calorias',
    question: '¿De dónde sale la cantidad de calorías?',
    answer:
      'De Mifflin–St Jeor, la fórmula de metabolismo basal que mejor predice en adultos, por un factor de actividad. Es una estimación poblacional: para la mitad de la gente acierta dentro del 10 %. Si en dos o tres semanas el peso no se mueve en la dirección que elegiste, el número tuyo es otro: cambiá el objetivo o la actividad.',
  },
  {
    id: 'proteina',
    question: '¿Por qué tanta proteína?',
    answer:
      '1,6 g por kilo de peso (1,8 si querés bajar) es lo que la evidencia respalda para conservar músculo con déficit calórico y para saciar. Nunca pasa del 30 % de las calorías. Si el plan no llega con las recetas, suma un refuerzo declarado —media lata de atún, un huevo duro, un yogur— y te lo dice.',
  },
  {
    id: 'precios',
    question: '¿Los precios son reales?',
    answer:
      'Los marcados SIPC son la mediana nacional del relevamiento oficial de precios (Sistema de Información de Precios al Consumidor, MEF) del día que dice la página, que el sitio mide todos los días. Los marcados "estimado" son de productos que ese catálogo no tiene (leche, legumbres, cebolla, zanahoria, avena) y son un precio de góndola de Montevideo, relevado a mano y fechado. El total dice qué parte es cada cosa.',
  },
  {
    id: 'cuantas-personas',
    question: '¿Puedo usarlo para toda la familia?',
    answer:
      'Podés elegir hasta 6 personas: multiplica porciones y compras. Las calorías y macros son de la persona que cargó sus datos; el resto come porciones del mismo tamaño. Si conviven objetivos muy distintos (una persona de 1.400 kcal y otra de 3.000), armá dos planes y compartí los principales.',
  },
  {
    id: 'no-es',
    question: '¿Esto es una dieta?',
    answer:
      'Es un plan de comidas balanceado en calorías, proteína, grasa, carbohidratos y fibra, con recetas de despensa uruguaya. No es un plan clínico ni reemplaza a una nutricionista, y no sirve para embarazo, lactancia, menores ni patologías. Es la aritmética de qué cocinar el domingo para comer bien y barato toda la semana.',
  },
]

const title = 'Meal prep Uruguay: viandas para la semana'
const description =
  'Desayuno, almuerzo, merienda y cena de lunes a domingo con cuatro platos que se cocinan en un día, y la lista de compras a precios de supermercado medidos.'
const canonicalUrl = 'https://cambio-uruguay.com/meal-prep-uruguay'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: title,
        description,
        url: canonicalUrl,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        inLanguage: 'es-UY',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'UYU' },
        creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  position: relative;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(34, 197, 94, 0.3), transparent 55%),
    radial-gradient(120% 160% at 0% 100%, rgba(245, 158, 11, 0.28), transparent 55%),
    linear-gradient(135deg, #14261c 0%, #1a2a24 55%, #121a1f 100%);
}
.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  color: #c7f0d2;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.5rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 820px;
  line-height: 1.6;
  font-size: 1rem;
  margin-top: 0;
  margin-bottom: 0.75rem;
}
.hero-lead--small {
  font-size: 0.9rem;
  margin-bottom: 0;
  color: rgba(255, 255, 255, 0.78);
}
.table-scroll {
  overflow-x: auto;
}
.mp-section-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.mp-para {
  margin-top: 0;
  margin-bottom: 1rem;
  max-width: 900px;
}
.mp-sub {
  font-weight: 700;
  font-size: 0.875rem;
  margin-bottom: 0.35rem;
}
.mp-list {
  padding-left: 1.2rem;
  margin-top: 0;
  margin-bottom: 0.75rem;
}
.mp-list li {
  margin-bottom: 0.3rem;
}
.mp-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}
.mp-stat {
  border: 1px solid rgb(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.mp-stat--primary {
  border-color: rgb(var(--v-theme-primary));
}
.mp-stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.mp-stat-value {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
}
.mp-stat-note {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.mp-cell-name {
  font-weight: 600;
  line-height: 1.3;
}
.mp-cell-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.25rem;
}
.mp-boost {
  color: rgb(var(--v-theme-primary));
}
.mp-task-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.mp-task-index {
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}
.mp-label {
  border: 1px dashed rgb(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  margin-top: 0.5rem;
}
.mp-label-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
</style>
