export type Role = 'ADMIN' | 'FINANCEIRO' | 'OPERADOR' | 'CONSULTA';

export type StandardStatus = 'ACTIVE' | 'PAUSED' | 'FINISHED' | 'CANCELLED';

export const STANDARD_STATUS_LABELS: Record<StandardStatus, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  FINISHED: 'Encerrado',
  CANCELLED: 'Cancelado',
};

export const normalizeStandardStatus = (rawStatus?: string | null): StandardStatus | null => {
  if (!rawStatus) return null;
  const s = rawStatus.toUpperCase();

  if (s === 'ACTIVE' || s === 'ATIVO' || s === 'IN_PROGRESS' || s === 'PLANNING' || s === 'PENDING' || s === 'OVERDUE' || s === 'PARTIALLY_PAID' || s === 'DRAFT') {
    return 'ACTIVE';
  }
  if (s === 'PAUSED' || s === 'PARALISADA' || s === 'PAUSADO' || s === 'IN_RENEGOTIATION') {
    return 'PAUSED';
  }
  if (s === 'FINISHED' || s === 'COMPLETED' || s === 'ENCERRADO' || s === 'CONCLUÍDA' || s === 'CONCLUIDA' || s === 'SETTLED' || s === 'TERMINATED' || s === 'PAID') {
    return 'FINISHED';
  }
  if (s === 'CANCELLED' || s === 'CANCELADA' || s === 'CANCELADO' || s === 'RESCINDED' || s === 'RENEGOTIATED') {
    return 'CANCELLED';
  }

  return null;
};

export interface StatusChangePayload {
  status: StandardStatus;
  reason?: string;
  notes?: string;
  statusDate?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  status?: StandardStatus;
  statusLabel?: string;
  statusReason?: string;
  statusNotes?: string;
  statusDate?: string;
  companyId: number;
  companyName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  name: string;
  email: string;
  role: Role;
  companyId: number;
  companyName: string;
}

export interface SetupStatus {
  setupRequired: boolean;
  message: string;
}

export interface Company {
  id: number;
  cnpj: string;
  corporateName: string;
  tradeName: string;
  stateRegistration?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  defaultPenaltyPercent: number;
  defaultInterestPercentMonthly: number;
  defaultGraceDays: number;
  createdAt: string;
}

export type CondominiumType =
  | 'RESIDENTIAL_CONDOMINIUM'
  | 'COMMERCIAL_CONDOMINIUM'
  | 'BUILDING'
  | 'LOT'
  | 'PRIVATE_WORK'
  | 'OTHER'
  | 'VERTICAL'
  | 'HORIZONTAL';

export const CONDOMINIUM_TYPE_LABELS: Record<CondominiumType, string> = {
  RESIDENTIAL_CONDOMINIUM: 'Condomínio Residencial',
  COMMERCIAL_CONDOMINIUM: 'Condomínio Comercial',
  BUILDING: 'Edifício',
  LOT: 'Loteamento',
  PRIVATE_WORK: 'Obra Particular',
  OTHER: 'Outro',
  VERTICAL: 'Edifício',
  HORIZONTAL: 'Loteamento',
};

export type ConstructionStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export const CONSTRUCTION_STATUS_LABELS: Record<ConstructionStatus, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  PAUSED: 'Paralisada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export interface Condominium {
  id: number;
  companyId: number;
  name: string;
  cnpj?: string;
  type: CondominiumType;
  typeLabel?: string;
  registrationNumber?: string;
  permitNumber?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;

  // Responsáveis
  managerName?: string;
  managerCpf?: string;
  managerPhone?: string;
  managerEmail?: string;
  administratorName?: string;
  administratorCnpj?: string;
  financialContactName?: string;
  financialContactPhone?: string;
  financialContactEmail?: string;

  // Dados da Obra
  workType?: string;
  constructionStatus: ConstructionStatus;
  constructionStatusLabel?: string;
  status?: StandardStatus;
  statusLabel?: string;
  statusReason?: string;
  statusNotes?: string;
  statusDate?: string;
  startDate?: string;
  expectedCompletionDate?: string;
  haltReason?: string;
  constructionCompany?: string;
  chiefEngineer?: string;
  creaCau?: string;
  notes?: string;

  // Estrutura
  totalBlocks?: number;
  totalTowers?: number;
  totalUnitsPlanned?: number;
  parkingSpaces?: number;
  totalArea?: number;

  totalUnits?: number;
  actualBlocksCount?: number;
  actualUnitsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BuildingBlock {
  id: number;
  condominiumId: number;
  condominiumName: string;
  name: string;
  totalFloors?: number;
  notes?: string;
  totalUnits: number;
  createdAt: string;
}

export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED';

export interface Unit {
  id: number;
  buildingBlockId: number;
  buildingBlockName: string;
  condominiumId: number;
  condominiumName: string;
  unitNumber: string;
  floorNumber?: number;
  typology?: string;
  privateArea?: number;
  totalArea?: number;
  parkingSpaces: number;
  idealFraction?: number;
  basePrice: number;
  status: UnitStatus;
  version: number;
  notes?: string;
  createdAt: string;
}

export type CustomerType = 'INDIVIDUAL' | 'LEGAL_ENTITY';

export interface Customer {
  id: number;
  companyId: number;
  customerType: CustomerType;
  name: string;
  document: string;
  stateOrIdDocument?: string;
  maritalStatus?: string;
  profession?: string;
  spouseName?: string;
  spouseDocument?: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  lgpdConsent: boolean;
  lgpdConsentDate?: string;
  status?: StandardStatus;
  statusLabel?: string;
  statusReason?: string;
  statusNotes?: string;
  statusDate?: string;
  createdAt: string;
}

export type ContractType = 'CUSTOMER_PURCHASE' | 'CONDOMINIUM';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SETTLED' | 'CANCELLED' | 'RESCINDED' | 'IN_RENEGOTIATION' | 'TERMINATED';
export type AdjustmentIndex = 'NONE' | 'INCC' | 'IPCA' | 'IGPM';
export type InstallmentType = 'DOWN_PAYMENT' | 'MONTHLY' | 'INTERMEDIATE' | 'KEYS';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'RENEGOTIATED';
export type PaymentMethod = 'PIX' | 'BOLETO' | 'BANK_TRANSFER' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHEQUE';

export type ServiceType =
  | 'CONSTRUCTION'
  | 'RENOVATION'
  | 'MAINTENANCE'
  | 'INSTALLATION'
  | 'PAINTING'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'POST_CONSTRUCTION_CLEANING'
  | 'SECURITY'
  | 'ADMINISTRATION'
  | 'OTHER';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  CONSTRUCTION: 'Construção',
  RENOVATION: 'Reforma',
  MAINTENANCE: 'Manutenção',
  INSTALLATION: 'Instalação',
  PAINTING: 'Pintura',
  ELECTRICAL: 'Elétrica',
  PLUMBING: 'Hidráulica',
  POST_CONSTRUCTION_CLEANING: 'Limpeza pós-obra',
  SECURITY: 'Segurança',
  ADMINISTRATION: 'Administração',
  OTHER: 'Outro',
};

export type PricingModel = 'TOTAL_VALUE' | 'MONTHLY_VALUE';

export interface InstallmentPreview {
  installmentNumber: number;
  totalInstallments: number;
  installmentType: InstallmentType;
  dueDate: string;
  businessDueDate: string;
  baseAmount: number;
  notes?: string;
}

export interface SimulationResponse {
  totalContractAmount: number;
  sumOfInstallments: number;
  difference: number;
  totalInstallmentsCount: number;
  installments: InstallmentPreview[];
}

export interface Contract {
  id: number;
  companyId: number;
  contractType?: ContractType;
  customerId?: number;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  customerEmail?: string;
  unitId?: number;
  unitNumber?: string;
  buildingBlockName?: string;
  condominiumId?: number;
  condominiumName?: string;
  condominiumCnpj?: string;
  condominiumAddress?: string;
  condominiumManagerName?: string;
  condominiumManagerPhone?: string;
  serviceType?: ServiceType;
  serviceLabel?: string;
  serviceDescription?: string;
  pricingModel?: PricingModel;
  billingType?: string;
  paymentMethod?: string;
  discountAmount?: number;
  description?: string;
  paymentCondition?: string;
  contractNumber: string;
  contractStatus: ContractStatus | StandardStatus;
  contractStatusLabel?: string;
  contractDate: string;
  totalAmount: number;
  downPayment: number;
  status: StandardStatus | ContractStatus;
  statusLabel?: string;
  statusReason?: string;
  statusNotes?: string;
  statusDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  adjustmentIndex: AdjustmentIndex;
  penaltyPercent: number;
  interestPercentMonthly: number;
  graceDays: number;
  notes?: string;
  version: number;
  totalInstallmentsCount: number;
  paidInstallmentsCount: number;
  openInstallmentsCount?: number;
  overdueInstallmentsCount: number;
  totalPaidAmount: number;
  totalOutstandingBalance: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  installmentId: number;
  paymentDate: string;
  amountReceived: number;
  penaltyApplied: number;
  interestApplied: number;
  discountApplied: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  registeredByUserName?: string;
  notes?: string;
  createdAt: string;
}

export interface Installment {
  id: number;
  contractId: number;
  contractNumber: string;
  contractStatus: ContractStatus | StandardStatus;
  contractStatusLabel?: string;
  customerId?: number;
  customerName: string;
  condominiumId?: number;
  condominiumName: string;
  unitNumber?: string;
  serviceType?: ServiceType;
  serviceLabel?: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentType: InstallmentType;
  dueDate: string;
  businessDueDate: string;
  baseAmount: number;
  originalAmount: number;
  penaltyAmount: number;
  interestAmount: number;
  discountAmount: number;
  totalPayable: number;
  daysLate: number;
  updatedAmount: number;
  paidAmount: number;
  balanceAmount: number;
  financialSituation: 'EM_ABERTO' | 'VENCE_HOJE' | 'VENCIDA' | 'PARCIALMENTE_PAGA' | 'PAGA' | 'CANCELADA';
  financialSituationLabel: string;
  financialSituationDate?: string;
  version: number;
  notes?: string;
  payments?: PaymentRecord[];
  createdAt: string;
}

export interface DashboardSummary {
  totalVgv: number;
  totalReceived: number;
  totalReceivable: number;
  totalOverdueAmount: number;
  totalOverdueCount: number;
  currentMonthExpected: number;
  currentMonthReceived: number;
  totalCondominiums: number;
  totalUnits: number;
  availableUnits: number;
  soldUnits: number;
  reservedUnits: number;
  activeContracts: number;
  unitsByStatus: Record<string, number>;
  totalCustomers: number;
  customersByStatus: Record<StandardStatus, number>;
  installmentsBySituation: Record<string, number>;
}

export interface AuditLog {
  id: number;
  action: string;
  entityName: string;
  entityId: string;
  performedByEmail: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}
