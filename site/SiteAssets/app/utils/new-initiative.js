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
  ViewSwitcher,
  NumberInput,
  ContextStore,
  fromFieldValue,
  __zod,
} from '../libs/nofbiz/nofbiz.base.js';

import { TEAM_OPTIONS } from './roles.js';
import { create, update } from './iniciativas-api.js';
import { STATUS } from './status-helpers.js';
import { getAssignedMentor } from './routing-rules.js';

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

  // -- Step 1 form fields --
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

  const problemField = new FormField({ value: initiative?.Problem || '' });
  const objectiveField = new FormField({ value: initiative?.Objective || '' });
  const confidentialField = new FormField({ value: initiative?.IsConfidential === true || initiative?.IsConfidential === 'true' });

  const schema = new FormSchema({ title: titleField, team: teamField });

  // -- Step 3 form fields --
  const TIME_PERIOD_OPTIONS = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];
  const timePeriodField = new FormField({ value: initiative?.ImpactTimePeriod || '' });

  const existingAntes = initiative?.ImpactDataAntes ? fromFieldValue(initiative.ImpactDataAntes) : null;

  const volumePropostasField = new FormField({ value: existingAntes?.volumePropostas || 0 });
  const montanteMedioField = new FormField({ value: existingAntes?.montanteMedio || 0 });
  const taxaTransformacaoField = new FormField({ value: existingAntes?.taxaTransformacao || 0 });
  const volumeField = new FormField({ value: existingAntes?.volume || 0 });
  const custoUnitarioField = new FormField({ value: existingAntes?.custoUnitario || 0 });
  const volumesProcessadosField = new FormField({ value: existingAntes?.volumesProcessados || 0 });
  const tempoTratamentoField = new FormField({ value: existingAntes?.tempoTratamento || 0 });

  // -- Shared helpers (DRY) --

  const collectBaseFields = () => {
    const teamVal = teamField.value;
    const impactedTeamOUID = teamVal && typeof teamVal === 'object' ? teamVal.value : (teamVal || '');
    const mentor = getAssignedMentor(impactedTeamOUID);
    return {
      Title: titleField.value,
      Description: descriptionField.value,
      ImpactedTeamOUID: impactedTeamOUID,
      SavingType: 'Sem saving',
      SavingsValue: '',
      Problem: problemField.value,
      Objective: objectiveField.value,
      IsConfidential: confidentialField.value,
      Mentor: mentor ? { email: mentor.email, displayName: mentor.displayName } : '',
      GestorValidator: '',
    };
  };

  const collectImpactFields = () => {
    const pf = (volumePropostasField.value || 0) * (montanteMedioField.value || 0) * ((taxaTransformacaoField.value || 0) / 100);
    const v = timePeriodField.value;
    return {
      ImpactTimePeriod: v && typeof v === 'object' ? v.label : (v || ''),
      ImpactDataAntes: {
        volumePropostas: volumePropostasField.value || 0,
        montanteMedio: montanteMedioField.value || 0,
        taxaTransformacao: taxaTransformacaoField.value || 0,
        volume: volumeField.value || 0,
        custoUnitario: custoUnitarioField.value || 0,
        volumesProcessados: volumesProcessadosField.value || 0,
        tempoTratamento: tempoTratamentoField.value || 0,
        producaoFinal: pf,
      },
    };
  };

  const saveAsDraft = async (btn, extraFields = {}) => {
    if (!schema.isValid) {
      schema.focusOnFirstInvalid();
      Toast.error('Preencha o titulo e seleccione a equipa.');
      return;
    }
    btn.isLoading = true;
    const loading = Toast.loading('A guardar rascunho...');
    try {
      const fields = { ...collectBaseFields(), ...extraFields, Status: STATUS.RASCUNHO };
      if (isEdit) {
        await update(initiative.ID, fields, initiative['odata.etag']);
      } else {
        const currentUser = ContextStore.get('currentUser');
        const identity = { email: currentUser.get('email'), displayName: currentUser.get('displayName') };
        await create({ ...fields, CreatedBy: identity, CreatedByEmail: currentUser.get('email'), CreatedByName: currentUser.get('displayName') });
      }
      loading.success('Rascunho guardado com sucesso');
      modal.close();
      if (onSuccess) onSuccess();
    } catch (error) {
      loading.error('Erro ao guardar rascunho');
    } finally {
      btn.isLoading = false;
    }
  };

  const submitInitiative = async (btn, extraFields = {}) => {
    if (!schema.isValid) {
      schema.focusOnFirstInvalid();
      Toast.error('Preencha o titulo e seleccione a equipa.');
      return;
    }
    btn.isLoading = true;
    const loading = Toast.loading('A submeter iniciativa...');
    try {
      const currentUser = ContextStore.get('currentUser');
      const identity = { email: currentUser.get('email'), displayName: currentUser.get('displayName') };
      const fields = {
        ...collectBaseFields(),
        ...extraFields,
        Status: STATUS.SUBMETIDO,
        SubmittedDate: new Date().toISOString().split('T')[0],
        SubmittedBy: identity,
        SubmittedByEmail: currentUser.get('email'),
      };
      if (isEdit) {
        await update(initiative.ID, fields, initiative['odata.etag']);
      } else {
        await create({ ...fields, CreatedBy: identity, CreatedByEmail: currentUser.get('email'), CreatedByName: currentUser.get('displayName') });
      }
      loading.success('Iniciativa submetida com sucesso');
      modal.close();
      if (onSuccess) onSuccess();
    } catch (error) {
      loading.error('Erro ao submeter iniciativa');
    } finally {
      btn.isLoading = false;
    }
  };

  // ===== STEP 1 -- Basic Info =====

  const titleInput = new FieldLabel('Titulo *', new TextInput(titleField, { placeholder: 'Ex: Reducao do tempo de...' }));
  const descInput = new FieldLabel('Descricao', new TextArea(descriptionField, { placeholder: 'Descreva a oportunidade...', rows: 3 }));
  const teamCombo = new FieldLabel('Equipa *', new ComboBox(teamField, TEAM_OPTIONS, { placeholder: 'Seleccionar...' }));
  const problemInput = new FieldLabel('Problema / Oportunidade', new TextArea(problemField, { placeholder: 'Descreva o problema ou oportunidade...', rows: 3 }));
  const objectiveInput = new FieldLabel('Objectivo', new TextArea(objectiveField, { placeholder: 'Qual o objectivo esperado?', rows: 3 }));
  const confidentialCheck = new Container([
    new CheckBox(confidentialField, { title: 'Confidencial' }),
    new Text('Marcar como confidencial', { type: 'span' }),
  ], { class: 'pace-checkbox-row' });

  const step1DraftBtn = new Button('Gravar Rascunho', {
    variant: 'secondary',
    onClickHandler: () => saveAsDraft(step1DraftBtn),
  });

  const step1ContinueBtn = new Button('Continuar', {
    variant: 'primary',
    onClickHandler: () => {
      if (!schema.isValid) {
        schema.focusOnFirstInvalid();
        Toast.error('Preencha o titulo e seleccione a equipa.');
        return;
      }
      wizard.setView('step2');
    },
  });

  const step1CancelBtn = new Button('Cancelar', {
    variant: 'secondary',
    isOutlined: true,
    onClickHandler: () => modal.close(),
  });

  const step1View = new View([
    new Container([
      titleInput,
      descInput,
      teamCombo,
      problemInput,
      objectiveInput,
      confidentialCheck,
    ], { class: 'pace-initiative-form' }),
    new Container([step1CancelBtn, step1DraftBtn, step1ContinueBtn], { class: 'pace-modal-footer' }),
  ]);

  // ===== STEP 2 -- Quantification Question =====

  const step2NaoDraftBtn = new Button('Gravar Rascunho', {
    variant: 'secondary',
    onClickHandler: () => saveAsDraft(step2NaoDraftBtn, { RequiresMentorForSubmission: 'true' }),
  });

  const step2NaoSubmitBtn = new Button('Submeter', {
    variant: 'primary',
    onClickHandler: () => submitInitiative(step2NaoSubmitBtn, {
      RequiresMentorForSubmission: 'true',
      SavingType: 'Sem saving',
      GestorValidator: '',
    }),
  });

  const naoSection = new View([
    new Text('Sem problema -- o seu mentor ira ajuda-lo a quantificar a iniciativa apos submissao.', { type: 'p', class: 'pace-wizard-hint' }),
    new Container([step2NaoDraftBtn, step2NaoSubmitBtn], { class: 'pace-modal-footer' }),
  ], { showOnRender: initiative?.RequiresMentorForSubmission === 'true' });

  const step2SimBtn = new Button('Sim', {
    variant: 'primary',
    onClickHandler: () => wizard.setView('step3'),
  });

  const step2NaoBtn = new Button('Nao', {
    variant: 'secondary',
    onClickHandler: () => naoSection.show(150),
  });

  const step2BackBtn = new Button('Voltar', {
    variant: 'secondary',
    isOutlined: true,
    onClickHandler: () => wizard.setView('step1'),
  });

  const step2View = new View([
    new Container([
      new Text('Consegue quantificar/tipificar a iniciativa?', { type: 'h3' }),
      new Text('Esta informacao ajuda a medir o impacto da sua iniciativa.', { type: 'p' }),
      new Container([step2SimBtn, step2NaoBtn], { class: 'pace-wizard-choice' }),
      naoSection,
    ], { class: 'pace-wizard-question' }),
    new Container([step2BackBtn], { class: 'pace-modal-footer' }),
  ]);

  // ===== STEP 3 -- Impact Metrics (ANTES) =====

  const initialPF = (volumePropostasField.value || 0) * (montanteMedioField.value || 0) * ((taxaTransformacaoField.value || 0) / 100);
  const pfDisplay = new Text(initialPF.toFixed(2), { type: 'span' });

  const updatePF = () => {
    const pf = (volumePropostasField.value || 0) * (montanteMedioField.value || 0) * ((taxaTransformacaoField.value || 0) / 100);
    pfDisplay.text = pf.toFixed(2);
  };
  volumePropostasField.subscribe(updatePF);
  montanteMedioField.subscribe(updatePF);
  taxaTransformacaoField.subscribe(updatePF);

  const step3BackBtn = new Button('Voltar', {
    variant: 'secondary',
    isOutlined: true,
    onClickHandler: () => wizard.setView('step2'),
  });

  const step3DraftBtn = new Button('Gravar Rascunho', {
    variant: 'secondary',
    onClickHandler: () => saveAsDraft(step3DraftBtn, {
      RequiresMentorForSubmission: 'false',
      ...collectImpactFields(),
    }),
  });

  const step3SubmitBtn = new Button('Submeter', {
    variant: 'primary',
    onClickHandler: () => submitInitiative(step3SubmitBtn, {
      RequiresMentorForSubmission: 'false',
      ...collectImpactFields(),
    }),
  });

  const step3View = new View([
    new Container([
      new Text('Contabilizacao de Ganhos/Impacto', { type: 'h3' }),
      new Text('Estes sao valores esperados/estimados.', { type: 'p' }),
      new FieldLabel('Periodo de tempo medido', new ComboBox(timePeriodField, TIME_PERIOD_OPTIONS, { placeholder: 'Seleccionar...' })),
      new Container([
        new FieldLabel('V (AS IS): Volume propostas enviados [unid./mes]', new NumberInput(volumePropostasField, { min: 0, step: 1 })),
        new FieldLabel('Mu (AS IS): Montante medio, cada proposta [EUR]', new NumberInput(montanteMedioField, { min: 0, step: 1 })),
        new FieldLabel('TT (AS IS): Taxa de Transformacao [%]', new NumberInput(taxaTransformacaoField, { min: 0, max: 100, step: 0.1 })),
        new FieldLabel('V (AS IS): Volume [unid]', new NumberInput(volumeField, { min: 0, step: 1 })),
        new FieldLabel('C (AS IS): Custo unitario [EUR/mes]', new NumberInput(custoUnitarioField, { min: 0, step: 0.01 })),
        new FieldLabel('V (AS IS): Volumes processados, mensal [unid.]', new NumberInput(volumesProcessadosField, { min: 0, step: 1 })),
        new FieldLabel('Tu (AS IS): Tempo de tratamento unitario [min]', new NumberInput(tempoTratamentoField, { min: 0, step: 0.1 })),
      ], { class: 'pace-impact-metrics' }),
      new Container([
        new Text('PF (AS IS) = V x Mu x TT [EUR/mes]', { type: 'span' }),
        pfDisplay,
      ], { class: 'pace-impact-row--computed' }),
    ], { class: 'pace-initiative-form' }),
    new Container([step3BackBtn, step3DraftBtn, step3SubmitBtn], { class: 'pace-modal-footer' }),
  ]);

  // ===== ViewSwitcher Wizard =====

  const wizard = new ViewSwitcher([
    ['step1', step1View],
    ['step2', step2View],
    ['step3', step3View],
  ]);

  // ===== Modal =====

  const modal = new Modal([
    new Text(isEdit ? 'Editar Iniciativa PDCA' : 'Nova Iniciativa PDCA', { type: 'h2', class: 'pace-modal-title' }),
    wizard,
  ], {
    closeOnFocusLoss: false,
    class: 'pace-initiative-modal',
    containerSelector: 'body',
    onCloseHandler: () => {
      volumePropostasField.dispose();
      montanteMedioField.dispose();
      taxaTransformacaoField.dispose();
      timePeriodField.dispose();
      volumeField.dispose();
      custoUnitarioField.dispose();
      volumesProcessadosField.dispose();
      tempoTratamentoField.dispose();
      titleField.dispose();
      descriptionField.dispose();
      teamField.dispose();
      problemField.dispose();
      objectiveField.dispose();
      confidentialField.dispose();
    },
  });

  modal.render();
  modal.open();
  return modal;
}
