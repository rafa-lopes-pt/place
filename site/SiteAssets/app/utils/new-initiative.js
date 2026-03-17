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
  ContextStore,
  __zod,
} from '../libs/nofbiz/nofbiz.base.js';

import { getUserOUID } from './roles.js';
import { getGovernanceOUID } from './equipas-api.js';
import { create, update } from './iniciativas-api.js';
import { STATUS } from './status-helpers.js';
import { getAssignedMentor, getAssignedGestor } from './routing-rules.js';

const SAVING_TYPES = ['Sem saving', 'Hard Saving', 'Soft Saving'];

const TEAM_OPTIONS = [
  { label: 'COM-GOV - Commercial', value: 'COM-GOV' },
  { label: 'COM-BKP - Banking Partnerships', value: 'COM-BKP' },
  { label: 'COM-BRP - Broker Partnerships', value: 'COM-BRP' },
  { label: 'COM-DRC - Strategy & Planning DRC', value: 'COM-DRC' },
  { label: 'COM-MOB - Mobility OEM & Top Dealers', value: 'COM-MOB' },
  { label: 'COM-RMI - Relational Marketing & Insurance', value: 'COM-RMI' },
  { label: 'COM-STF - Stock Financing', value: 'COM-STF' },
  { label: 'FIN-GOV - Finance', value: 'FIN-GOV' },
  { label: 'FIN-CTB - Contabilidade e Tesouraria', value: 'FIN-CTB' },
  { label: 'FIN-GRF - Granting & Financing', value: 'FIN-GRF' },
  { label: 'ITD-GOV - IT & Digital', value: 'ITD-GOV' },
  { label: 'ITD-CGP - COE IT Governance', value: 'ITD-CGP' },
  { label: 'ITD-DAT - COE Data', value: 'ITD-DAT' },
  { label: 'ITD-ODD - TIBRO ODD', value: 'ITD-ODD' },
  { label: 'ITD-SRV - IT Service Delivery', value: 'ITD-SRV' },
  { label: 'LEG-JRI - Juridico e Relacoes Inst.', value: 'LEG-JRI' },
  { label: 'LEG-JUR - Juridico', value: 'LEG-JUR' },
  { label: 'OPS-GOV - Operations', value: 'OPS-GOV' },
  { label: 'OPS-BSP - Operations & Business Support', value: 'OPS-BSP' },
  { label: 'OPS-CCR - Customer Care & Rebound', value: 'OPS-CCR' },
  { label: 'OPS-COL - Operational Collections', value: 'OPS-COL' },
  { label: 'RSK-GOV - Risk & Compliance', value: 'RSK-GOV' },
  { label: 'RSK-ANA - Risk Analytics', value: 'RSK-ANA' },
  { label: 'RSK-REG - Risk Governance & Regulatory', value: 'RSK-REG' },
  { label: 'RSK-CCT - Conduct & Control', value: 'RSK-CCT' },
  { label: 'STR-GOV - Strategy & Transformation', value: 'STR-GOV' },
  { label: 'STR-AGI - Transformation & COE Agile', value: 'STR-AGI' },
  { label: 'STR-BRD - Brand Communication & Offer', value: 'STR-BRD' },
  { label: 'STR-COO - Direccao COO & Transformation', value: 'STR-COO' },
  { label: 'STR-MKT - Strategic Marketing & COE CX', value: 'STR-MKT' },
  { label: 'STR-SYN - Group Synergies', value: 'STR-SYN' },
];

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
  const z = __zod;

  // -- Form fields --
  const titleField = new FormField({
    value: initiative?.Title || '',
    validatorCallback: (v) => z.string().min(1).safeParse(v).success,
  });

  const descriptionField = new FormField({ value: initiative?.Description || '' });

  const teamField = new FormField({
    value: initiative?.ImpactedTeamOUID || '',
    validatorCallback: (v) => {
      const val = v && typeof v === 'object' ? v.value : v;
      return z.string().min(1).safeParse(val).success;
    },
  });

  const savingTypeField = new FormField({ value: initiative?.SavingType || 'Sem saving' });
  const estimateField = new FormField({ value: initiative?.SavingsValue || '' });
  const problemField = new FormField({ value: initiative?.Problem || '' });
  const objectiveField = new FormField({ value: initiative?.Objective || '' });
  const confidentialField = new FormField({ value: initiative?.IsConfidential === true || initiative?.IsConfidential === 'true' });

  // -- Schema for basic validation (title + team) --
  const schema = new FormSchema({ title: titleField, team: teamField });

  // -- Form inputs --
  const titleInput = new FieldLabel('Titulo *', new TextInput(titleField, { placeholder: 'Ex: Reducao do tempo de...' }));
  const descInput = new FieldLabel('Descricao', new TextArea(descriptionField, { placeholder: 'Descreva a oportunidade...', rows: 3 }));

  const teamCombo = new FieldLabel('Equipa *', new ComboBox(teamField, TEAM_OPTIONS, { placeholder: 'Seleccionar...' }));

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
    new Container([teamCombo, savingTypeCombo], { class: 'pace-form-row' }),
    estimateView,
    problemInput,
    objectiveInput,
    confidentialCheck,
  ], { class: 'pace-initiative-form' });

  // -- Collect field values into a record --
  const collectFields = () => {
    const teamVal = teamField.value;
    const impactedTeamOUID = teamVal && typeof teamVal === 'object' ? teamVal.value : (teamVal || '');
    const savingVal = savingTypeField.value;
    const savingText = savingVal && typeof savingVal === 'object' ? savingVal.label : (savingVal || 'Sem saving');
    const mentor = getAssignedMentor(impactedTeamOUID);
    const gestor = getAssignedGestor(savingText, estimateField.value, impactedTeamOUID);

    return {
      Title: titleField.value,
      Description: descriptionField.value,
      ImpactedTeamOUID: impactedTeamOUID,
      SavingType: savingText,
      SavingsValue: estimateField.value,
      Problem: problemField.value,
      Objective: objectiveField.value,
      IsConfidential: confidentialField.value,
      Mentor: mentor ? { email: mentor.email, displayName: mentor.displayName } : '',
      GestorValidator: gestor ? { email: gestor.email, displayName: gestor.displayName } : '',
    };
  };

  // -- Action handlers --
  const draftBtn = new Button('Gravar Rascunho', {
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
        if (isEdit) {
          await update(initiative.ID, { ...collectFields(), Status: STATUS.RASCUNHO }, initiative['odata.etag']);
        } else {
          const currentUser = ContextStore.get('currentUser');
          const createdByIdentity = { email: currentUser.get('email'), displayName: currentUser.get('displayName') };
          await create({
            ...collectFields(),
            Status: STATUS.RASCUNHO,
            CreatedBy: createdByIdentity,
            CreatedByEmail: currentUser.get('email'),
            CreatedByName: currentUser.get('displayName'),
          });
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
        const currentUser = ContextStore.get('currentUser');
        const identity = { email: currentUser.get('email'), displayName: currentUser.get('displayName') };
        const submitFields = {
          ...collectFields(),
          Status: STATUS.SUBMETIDO,
          SubmittedDate: new Date().toISOString().split('T')[0],
          SubmittedBy: identity,
          SubmittedByEmail: currentUser.get('email'),
        };
        if (isEdit) {
          await update(initiative.ID, submitFields, initiative['odata.etag']);
        } else {
          await create({
            ...submitFields,
            CreatedBy: identity,
            CreatedByEmail: currentUser.get('email'),
            CreatedByName: currentUser.get('displayName'),
          });
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
    new Text(isEdit ? 'Editar Iniciativa PDCA' : 'Nova Iniciativa PDCA', { type: 'h2', class: 'pace-modal-title' }),
    formContent,
    footer,
  ], {
    closeOnFocusLoss: false,
    class: 'pace-initiative-modal',
    containerSelector: 'body',
  });

  modal.render();
  modal.open();
  return modal;
}
