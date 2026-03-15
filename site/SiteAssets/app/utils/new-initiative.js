import {
  Modal,
  Container,
  Text,
  TextInput,
  TextArea,
  ComboBox,
  CheckBox,
  Button,
  FormField,
  FormSchema,
  FieldLabel,
  Toast,
  View,
  __zod,
} from '../libs/nofbiz/nofbiz.base.js';

import { TEAMS } from './roles.js';
import { create, update } from './iniciativas-api.js';
import { STATUS } from './status-helpers.js';
import { getAssignedMentor, getAssignedGestor } from './routing-rules.js';

const SAVING_TYPES = ['Sem saving', 'Hard Saving', 'Soft Saving'];

/**
 * Opens a Modal form for creating a new initiative.
 * @param {() => void} onSuccess - Callback invoked after successful save/submit
 * @returns {Modal} The modal instance
 */
export function openNewInitiativeModal(onSuccess) {
  return buildInitiativeModal(null, onSuccess);
}

/**
 * Opens a Modal form for editing an existing initiative.
 * @param {Object} initiative - The initiative data to pre-fill
 * @param {() => void} onSuccess - Callback invoked after successful save/submit
 * @returns {Modal} The modal instance
 */
export function openEditInitiativeModal(initiative, onSuccess) {
  return buildInitiativeModal(initiative, onSuccess);
}

function buildInitiativeModal(initiative, onSuccess) {
  const isEdit = !!initiative;
  const z = __zod.z;

  // -- Form fields --
  const titleField = new FormField({
    value: initiative?.Title || '',
    validatorCallback: (v) => z.string().min(1).safeParse(v).success,
  });

  const descriptionField = new FormField({ value: initiative?.Description || '' });

  const teamField = new FormField({
    value: initiative?.Team || '',
    validatorCallback: (v) => {
      const text = v && typeof v === 'object' ? v.label : v;
      return z.string().min(1).safeParse(text).success;
    },
  });

  const savingTypeField = new FormField({ value: initiative?.SavingType || '' });
  const estimateField = new FormField({ value: initiative?.SavingEstimate || '' });
  const problemField = new FormField({ value: initiative?.Problem || '' });
  const objectiveField = new FormField({ value: initiative?.Objective || '' });
  const confidentialField = new FormField({ value: initiative?.Confidential === true || initiative?.Confidential === 'true' });

  // -- Schema for basic validation (title + team) --
  const schema = new FormSchema({ title: titleField, team: teamField });

  // -- Form inputs --
  const titleInput = new FieldLabel('Titulo *', new TextInput(titleField, { placeholder: 'Nome da iniciativa...' }));
  const descInput = new FieldLabel('Descricao', new TextArea(descriptionField, { placeholder: 'Descreva a iniciativa...', rows: 3 }));

  const teamOptions = TEAMS.map((t) => ({ label: t, value: t }));
  const teamCombo = new FieldLabel('Equipa *', new ComboBox(teamField, teamOptions, { placeholder: 'Seleccionar equipa...' }));

  const savingTypeCombo = new FieldLabel('Tipo de Saving', new ComboBox(savingTypeField, SAVING_TYPES, { placeholder: 'Seleccionar...' }));

  const estimateInput = new FieldLabel('Estimativa (EUR)', new TextInput(estimateField, { placeholder: 'Ex: 5000' }));
  const estimateView = new View([estimateInput], { showOnRender: false });

  // Show/hide estimate based on saving type
  savingTypeField.subscribe((val) => {
    const text = val && typeof val === 'object' ? val.label : val;
    if (text && text !== 'Sem saving') {
      estimateView.show(150);
    } else {
      estimateView.hide(150);
    }
  });

  // Initialize estimate visibility
  const initialSavingText = initiative?.SavingType || '';
  if (initialSavingText && initialSavingText !== 'Sem saving') {
    estimateView.showOnRender = true;
  }

  const problemInput = new FieldLabel('Problema / Oportunidade', new TextArea(problemField, { placeholder: 'Descreva o problema ou oportunidade...', rows: 3 }));
  const objectiveInput = new FieldLabel('Objectivo', new TextArea(objectiveField, { placeholder: 'Qual o objectivo esperado?', rows: 3 }));
  const confidentialCheck = new Container([
    new CheckBox(confidentialField, { title: 'Confidencial' }),
    new Text('Marcar como confidencial', { type: 'span' }),
  ], { class: 'pace-checkbox-row' });

  // -- Build form content --
  const formContent = new Container([
    titleInput,
    descInput,
    teamCombo,
    savingTypeCombo,
    estimateView,
    problemInput,
    objectiveInput,
    confidentialCheck,
  ], { class: 'pace-initiative-form' });

  // -- Collect field values into a record --
  const collectFields = () => {
    const teamVal = teamField.value;
    const teamText = teamVal && typeof teamVal === 'object' ? teamVal.label : (teamVal || '');
    const savingVal = savingTypeField.value;
    const savingText = savingVal && typeof savingVal === 'object' ? savingVal.label : (savingVal || 'Sem saving');
    const mentor = getAssignedMentor(teamText);
    const gestor = getAssignedGestor(savingText, estimateField.value, teamText);

    return {
      Title: titleField.value,
      Description: descriptionField.value,
      Team: teamText,
      SavingType: savingText,
      SavingEstimate: estimateField.value,
      Problem: problemField.value,
      Objective: objectiveField.value,
      Confidential: confidentialField.value,
      MentorEmail: mentor ? mentor.email : '',
      MentorName: mentor ? mentor.displayName : '',
      GestorEmail: gestor ? gestor.email : '',
      GestorName: gestor ? gestor.displayName : '',
    };
  };

  // -- Action handlers --
  const draftBtn = new Button('Guardar Rascunho', {
    variant: 'secondary',
    onClickHandler: async () => {
      if (!schema.isValid) {
        schema.focusOnFirstInvalid();
        Toast.error('Preencha o titulo e seleccione a equipa.');
        return;
      }

      draftBtn.isLoading = true;
      const loading = Toast.loading('A guardar rascunho...');
      try {
        const fields = { ...collectFields(), Status: STATUS.RASCUNHO };
        if (isEdit) {
          await update(initiative.ID, fields, initiative['odata.etag']);
        } else {
          await create(fields);
        }
        loading.success('Rascunho guardado com sucesso');
        modal.close();
        if (onSuccess) onSuccess();
      } catch (error) {
        loading.error('Erro ao guardar rascunho');
      } finally {
        draftBtn.isLoading = false;
      }
    },
  });

  const submitBtn = new Button('Submeter', {
    variant: 'primary',
    onClickHandler: async () => {
      if (!schema.isValid) {
        schema.focusOnFirstInvalid();
        Toast.error('Preencha o titulo e seleccione a equipa.');
        return;
      }

      submitBtn.isLoading = true;
      const loading = Toast.loading('A submeter iniciativa...');
      try {
        const fields = { ...collectFields(), Status: STATUS.SUBMETIDO };
        if (isEdit) {
          await update(initiative.ID, fields, initiative['odata.etag']);
        } else {
          await create(fields);
        }
        loading.success('Iniciativa submetida com sucesso');
        modal.close();
        if (onSuccess) onSuccess();
      } catch (error) {
        loading.error('Erro ao submeter iniciativa');
      } finally {
        submitBtn.isLoading = false;
      }
    },
  });

  const cancelBtn = new Button('Cancelar', {
    variant: 'secondary',
    isOutlined: true,
    onClickHandler: () => modal.close(),
  });

  const footer = new Container([cancelBtn, draftBtn, submitBtn], { class: 'pace-modal-footer' });

  const modal = new Modal([
    new Text(isEdit ? 'Editar Iniciativa' : 'Nova Iniciativa', { type: 'h2', class: 'pace-modal-title' }),
    formContent,
    footer,
  ], {
    closeOnFocusLoss: true,
    class: 'pace-initiative-modal',
  });

  modal.render();
  modal.open();
  return modal;
}
