import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';

interface User {
  id: number;
  username: string;
  password: string;  // 実際のアプリケーションでは、パスワードはハッシュ化して保存します
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLogin?: Date;
}

interface LoginForm {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

interface TaskProgress {
  date: string;
  plannedTasks: number;
  completedTasks: number;
}

interface BurndownData {
  date: string;
  plannedTasks: number;
  completedTasks: number;
  label: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  category?: string;
  tags?: string[];
  progress: number;
  bigProjectId?: number;
  assignee?: string;  // 追加
}

interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: 'not-started' | 'in-progress' | 'completed';
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  assignee?: string;
  category?: string;
}

interface BigProject {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  progress: number;
  manager?: string;
  priority: 'low' | 'medium' | 'high';
  subProjects: SubProject[];
}

interface SubProject {
  id: number;
  name: string;
  description?: string;
  startDate?: Date;
  startTime?: string;
  endDate?: Date;
  endTime?: string;
  assignee?: string;
  tasks: SubProjectTask[];
}

interface SubProjectTask {
  id: number;
  subProjectId: number;
  title: string;
  description?: string;
  status: 'not-started' | 'in-progress' | 'completed';
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  assignee?: string;
}

interface GanttTask {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  assignee: string;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface EditingTask {
  task: Task | SubProjectTask;
  projectId: number;
  subProjectId?: number;
}

interface SearchFilters {
  projects: boolean;
  tasks: boolean;
  bigProjects: boolean;
  subProjects: boolean;
}

interface SearchResult {
  id: number;
  title: string;
  description?: string;
  type: 'project' | 'task' | 'bigProject' | 'subProject' | 'subProjectTask';
  typeLabel: string;
  parent?: string;
  dates?: string;
  status?: string;
  projectId?: number;
  subProjectId?: number;
  bigProjectId?: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, ScrollingModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'プロジェクト管理';
  
  currentView: 'list' | 'gantt' | 'board' | 'burndown' | 'files' | 'bigProject' | 'search' = 'list';
  projects: Project[] = [];
  bigProjects: BigProject[] = [];
  selectedProject: Project | null = null;
  selectedBigProject: BigProject | null = null;
  projectTasks: { [projectId: number]: Task[] } = {};
  showProjectForm = false;
  showBigProjectForm = false;
  projectTaskForms: { [key: number]: boolean } = {};
  newTasks: { [key: number]: Partial<Task> } = {};
  activePanel: 'projects' | 'tasks' = 'projects';
  editingProject: Project | null = null;
  editingTask: EditingTask | null = null;
  editingBigProject: BigProject | null = null;
  
  private nextProjectId = 1;
  private nextBigProjectId = 1;

  newProject: Partial<Project> = this.getEmptyProject();
  newBigProject: Partial<BigProject> = this.getEmptyBigProject();
  showBigProjectCreateForm = false;
  showSubProjectForm: { [key: number]: boolean } = {};
  newSubProject: { [key: number]: Partial<SubProject> } = {};
  private nextSubProjectId = 1;

  showSubProjectTaskForm: { [key: number]: boolean } = {};
  newSubProjectTask: { [key: number]: Partial<SubProjectTask> } = {};
  private nextSubProjectTaskId = 1;

  editingSubProject: { bigProjectId: number; subProject: SubProject } | null = null;
  editingSubProjectTask: { bigProjectId: number; subProjectId: number; task: SubProjectTask } | null = null;

  ganttTasks: GanttTask[] = [];
  ganttStartDate: string = '2024-04-01';
  ganttEndDate: string = '2024-06-30';
  ganttMonths: string[] = ['4月', '5月', '6月'];

  burndownData: BurndownData[] = [];
  burndownStartDate: string = '';
  burndownEndDate: string = '';

  selectedProjectForBurndown: Project | SubProject | null = null;

  // 検索関連のプロパティ
  searchQuery: string = '';
  searchResults: SearchResult[] = [];
  searchFilters: SearchFilters = {
    projects: true,
    tasks: true,
    bigProjects: true,
    subProjects: true
  };

  // アカウント関連のプロパティ
  currentUser: User | null = null;
  users: User[] = [];
  showLoginForm = false;
  showRegisterForm = false;
  loginForm: LoginForm = {
    username: '',
    password: '',
    rememberMe: false
  };
  registerForm: RegisterForm = {
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  };
  loginError = '';
  registerError = '';
  private nextUserId = 1;

  constructor(private cdr: ChangeDetectorRef) {
    this.loadInitialData();
    this.loadUsers();  // ユーザーデータの読み込み
    this.checkStoredAuth();  // 保存された認証情報のチェック
    this.currentView = 'list';
    this.activePanel = 'projects';

    this.showSubProjectForm = {};
    this.newSubProject = {};
    this.showSubProjectTaskForm = {};
    this.newSubProjectTask = {};
    
    this.burndownStartDate = '';
    this.burndownEndDate = '';
    this.burndownData = [];
  }

  private getEmptyProject(): Partial<Project> {
    return {
      name: '',
      description: '',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '17:30',
      category: '',
      tags: [],
      progress: 0,
      assignee: ''
    };
  }

  private getEmptyTask(projectId: number): Partial<Task> {
    return {
      title: '',
      description: '',
      status: 'not-started',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '17:30',
      projectId: projectId
    };
  }

  private getEmptyBigProject(): Partial<BigProject> {
    return {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      budget: 0,
      status: 'planning',
      progress: 0,
      manager: '',
      priority: 'medium',
      subProjects: []
    };
  }

  private getEmptySubProject(): SubProject {
    return {
      id: 0,
      name: '',
      description: '',
      startDate: undefined,
      startTime: undefined,
      endDate: undefined,
      endTime: undefined,
      tasks: []
    };
  }

  private getEmptySubProjectTask(): Partial<SubProjectTask> {
    return {
      title: '',
      description: '',
      status: 'not-started',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '17:30'
    };
  }

  private loadInitialData() {
    this.projects = [];
    this.projectTasks = {};
    this.bigProjects = [];
    this.showSubProjectForm = {};
    this.newSubProject = {};
    this.showSubProjectTaskForm = {};
    this.newSubProjectTask = {};

    // テストプロジェクトの作成
    const testProject: Project = {
      id: this.nextProjectId++,
      name: 'イベント企画の内容設計',
      description: 'イベント企画のための内容設計プロジェクト',
      startDate: '2024-04-01',
      startTime: '09:00',
      endDate: '2024-06-30',
      endTime: '18:00',
      category: 'イベント',
      progress: 0
    };
    this.projects.push(testProject);

    // テストタスクの作成
    this.projectTasks[testProject.id] = [
      {
        id: 1,
        projectId: testProject.id,
        title: '現状分析',
        description: '現状の分析を行う',
        status: 'completed',
        startDate: '2024-04-01',
        startTime: '09:00',
        endDate: '2024-04-07',
        endTime: '18:00',
        assignee: '上野'
      },
      {
        id: 2,
        projectId: testProject.id,
        title: 'コンセプト設定',
        description: 'プロジェクトのコンセプトを設定',
        status: 'completed',
        startDate: '2024-04-08',
        startTime: '09:00',
        endDate: '2024-04-14',
        endTime: '18:00',
        assignee: '秋葉'
      },
      {
        id: 3,
        projectId: testProject.id,
        title: 'プログラム設計',
        description: 'プログラムの設計を行う',
        status: 'completed',
        startDate: '2024-04-08',
        startTime: '09:00',
        endDate: '2024-04-14',
        endTime: '18:00',
        assignee: '神田'
      },
      {
        id: 4,
        projectId: testProject.id,
        title: '告知ツールの構想設計',
        description: '告知ツールの設計',
        status: 'completed',
        startDate: '2024-04-15',
        startTime: '09:00',
        endDate: '2024-04-21',
        endTime: '18:00',
        assignee: '大久保'
      },
      {
        id: 5,
        projectId: testProject.id,
        title: '関係企画書への落とし込み',
        description: '企画書の作成',
        status: 'completed',
        startDate: '2024-04-15',
        startTime: '09:00',
        endDate: '2024-04-21',
        endTime: '18:00',
        assignee: '高田'
      },
      {
        id: 6,
        projectId: testProject.id,
        title: '告知・申し込みサイトの制作',
        description: 'Webサイトの制作',
        status: 'in-progress',
        startDate: '2024-04-22',
        startTime: '09:00',
        endDate: '2024-05-07',
        endTime: '18:00',
        assignee: '品川'
      },
      {
        id: 7,
        projectId: testProject.id,
        title: 'チラシ作成',
        description: 'チラシのデザインと制作',
        status: 'in-progress',
        startDate: '2024-05-01',
        startTime: '09:00',
        endDate: '2024-05-14',
        endTime: '18:00',
        assignee: '大塚'
      },
      {
        id: 8,
        projectId: testProject.id,
        title: 'メールマガジンの配信',
        description: 'メールマガジンの作成と配信',
        status: 'not-started',
        startDate: '2024-05-08',
        startTime: '09:00',
        endDate: '2024-06-14',
        endTime: '18:00',
        assignee: '渋谷'
      }
    ];

    // プロジェクトの進捗を更新
    this.updateProjectProgress(testProject.id);

    // テストビッグプロジェクトの作成
    const testBigProject: BigProject = {
      id: this.nextBigProjectId++,
      name: '新規Webサービス開発プロジェクト',
      description: '新規Webサービスの企画から開発までの包括的なプロジェクト',
      startDate: '2024-04-01',
      endDate: '2024-08-31',
      budget: 30000000,
      status: 'active',
      progress: 0,
      manager: '山田太郎',
      priority: 'high',
      subProjects: []
    };

    // サブプロジェクト: サービス開発
    const serviceDevelopment: SubProject = {
      id: this.nextSubProjectId++,
      name: 'Webサービス開発',
      description: 'Webサービスの設計・開発・テスト',
      startDate: new Date('2024-04-01'),
      startTime: '09:00',
      endDate: new Date('2024-08-31'),
      endTime: '18:00',
      assignee: '鈴木一郎',
      tasks: [
        {
          id: this.nextSubProjectTaskId++,
          subProjectId: 1,
          title: '要件定義',
          description: 'サービスの要件を定義',
          status: 'completed',
          startDate: '2024-04-01',
          startTime: '09:00',
          endDate: '2024-04-15',
          endTime: '18:00',
          assignee: '佐藤健一'
        },
        {
          id: this.nextSubProjectTaskId++,
          subProjectId: 1,
          title: '基本設計',
          description: 'システムの基本設計を作成',
          status: 'completed',
          startDate: '2024-04-16',
          startTime: '09:00',
          endDate: '2024-05-15',
          endTime: '18:00',
          assignee: '田中美咲'
        },
        {
          id: this.nextSubProjectTaskId++,
          subProjectId: 1,
          title: '詳細設計',
          description: 'システムの詳細設計を作成',
          status: 'in-progress',
          startDate: '2024-05-16',
          startTime: '09:00',
          endDate: '2024-06-15',
          endTime: '18:00',
          assignee: '高橋誠'
        },
        {
          id: this.nextSubProjectTaskId++,
          subProjectId: 1,
          title: 'フロントエンド開発',
          description: 'フロントエンドの実装',
          status: 'in-progress',
          startDate: '2024-06-01',
          startTime: '09:00',
          endDate: '2024-07-31',
          endTime: '18:00',
          assignee: '伊藤修'
        },
        {
          id: this.nextSubProjectTaskId++,
          subProjectId: 1,
          title: 'バックエンド開発',
          description: 'バックエンドの実装',
          status: 'not-started',
          startDate: '2024-06-01',
          startTime: '09:00',
          endDate: '2024-07-31',
          endTime: '18:00',
          assignee: '渡辺隆'
        },
        {
          id: this.nextSubProjectTaskId++,
          subProjectId: 1,
          title: 'テスト',
          description: '結合テストと総合テスト',
          status: 'not-started',
          startDate: '2024-08-01',
          startTime: '09:00',
          endDate: '2024-08-31',
          endTime: '18:00',
          assignee: '木村花子'
        }
      ]
    };

    // ビッグプロジェクトにサブプロジェクトを追加
    testBigProject.subProjects = [serviceDevelopment];
    this.bigProjects.push(testBigProject);

    // ガントチャートを初期化
    this.initializeGanttData();
    
    this.cdr.markForCheck();
  }

  private initializeGanttData() {
    // 全プロジェクトのタスクを取得
    const allTasks: GanttTask[] = [];

    // 通常のプロジェクトのタスクを追加
    this.projects.forEach(project => {
      const tasks = this.projectTasks[project.id] || [];
      tasks.forEach(task => {
        if (task.startDate && task.endDate) {
          allTasks.push({
            id: task.id,
            name: task.title,
            startDate: task.startDate,
            endDate: task.endDate,
            assignee: task.assignee || '未割当',
            status: task.status
          });
        }
      });
    });

    // ビッグプロジェクトのサブプロジェクトタスクを追加
    this.bigProjects.forEach(bigProject => {
      bigProject.subProjects.forEach(subProject => {
        subProject.tasks.forEach(task => {
          if (task.startDate && task.endDate) {
            allTasks.push({
              id: task.id,
              name: task.title,
              startDate: task.startDate,
              endDate: task.endDate,
              assignee: task.assignee || '未割当',
              status: task.status
            });
          }
        });
      });
    });

    // 開始日でソート
    this.ganttTasks = allTasks.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // ガントチャートの表示期間を設定
    if (this.ganttTasks.length > 0) {
      const dates = this.ganttTasks.map(task => [new Date(task.startDate), new Date(task.endDate)]).flat();
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // 月初めに調整
      minDate.setDate(1);
      // 月末に調整
      maxDate.setMonth(maxDate.getMonth() + 1, 0);

      this.ganttStartDate = minDate.toISOString().split('T')[0];
      this.ganttEndDate = maxDate.toISOString().split('T')[0];

      // 月のリストを更新
      const months: string[] = [];
      const currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        months.push(`${currentDate.getMonth() + 1}月`);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      this.ganttMonths = months;
    }
  }

  switchView(view: 'list' | 'gantt' | 'board' | 'burndown' | 'files' | 'bigProject' | 'search') {
    this.currentView = view;
    this.cdr.markForCheck();
  }

  updateGanttChart() {
    // 全プロジェクトのタスクを取得
    const allTasks: GanttTask[] = [];

    // 通常のプロジェクトのタスクを追加
    this.projects.forEach(project => {
      const tasks = this.projectTasks[project.id] || [];
      tasks.forEach(task => {
        if (task.startDate && task.endDate) {
          allTasks.push({
            id: task.id,
            name: task.title,
            startDate: task.startDate,
            endDate: task.endDate,
            assignee: task.assignee || '未割当',
            status: task.status
          });
        }
      });
    });

    // ビッグプロジェクトのサブプロジェクトタスクを追加
    this.bigProjects.forEach(bigProject => {
      bigProject.subProjects.forEach(subProject => {
        subProject.tasks.forEach(task => {
          if (task.startDate && task.endDate) {
            allTasks.push({
              id: task.id,
              name: task.title,
              startDate: task.startDate,
              endDate: task.endDate,
              assignee: task.assignee || '未割当',
              status: task.status
            });
          }
        });
      });
    });

    // 開始日でソート
    this.ganttTasks = allTasks.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // ガントチャートの表示期間を更新
    if (this.ganttTasks.length > 0) {
      const dates = this.ganttTasks.map(task => [new Date(task.startDate), new Date(task.endDate)]).flat();
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // 月初めに調整
      minDate.setDate(1);
      // 月末に調整
      maxDate.setMonth(maxDate.getMonth() + 1, 0);

      this.ganttStartDate = minDate.toISOString().split('T')[0];
      this.ganttEndDate = maxDate.toISOString().split('T')[0];

      // 月のリストを更新
      const months: string[] = [];
      const currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        months.push(`${currentDate.getMonth() + 1}月`);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      this.ganttMonths = months;
    }

    this.cdr.markForCheck();
  }

  addProject() {
    if (!this.newProject.name || !this.newProject.startDate || !this.newProject.endDate) {
      alert('プロジェクト名と期間は必須です');
      return;
    }

    const project: Project = {
      id: this.nextProjectId++,
      name: this.newProject.name,
      description: this.newProject.description || '',
      startDate: this.newProject.startDate,
      startTime: this.newProject.startTime || '09:00',
      endDate: this.newProject.endDate,
      endTime: this.newProject.endTime || '17:30',
      category: this.newProject.category || '',
      tags: this.newProject.tags || [],
      progress: 0
    };

    this.projects = [...this.projects, project];
    this.projectTasks = {
      ...this.projectTasks,
      [project.id]: []
    };
    
    this.resetProjectForm();
    this.selectProject(project);
    this.updateGanttChart(); // ガントチャートを更新
    this.cdr.markForCheck();
  }

  addTaskToProject(project: Project | undefined) {
    if (!project?.id) return;

    // 他のフォームをすべて閉じる
    Object.keys(this.projectTaskForms).forEach(key => {
      this.projectTaskForms[Number(key)] = false;
    });
    
    // 新しいタスクの初期化を確実に行う
    this.ensureNewTaskExists(project.id);

    // フォームの表示状態を更新
    this.projectTaskForms = {
      ...this.projectTaskForms,
      [project.id]: true
    };
    
    this.cdr.markForCheck();
  }

  createTask(projectId: number | undefined) {
    if (!projectId) {
      console.error('プロジェクトIDが指定されていません');
      return;
    }

    const newTask = this.newTasks[projectId];
    if (!newTask?.title) {
      alert('タスク名は必須です');
      return;
    }

    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      console.error('プロジェクトが見つかりません');
      return;
    }

    // 日付の妥当性チェック
    if (newTask.startDate && newTask.endDate) {
      const startDate = new Date(newTask.startDate);
      const endDate = new Date(newTask.endDate);
      if (endDate < startDate) {
        alert('終了日は開始日より後に設定してください');
        return;
      }
    }

    const taskId = this.getNextTaskId(projectId);
    const task: Task = {
      id: taskId,
      projectId: projectId,
      title: newTask.title,
      description: newTask.description || '',
      status: 'not-started',
      startDate: newTask.startDate,
      startTime: newTask.startTime || '09:00',
      endDate: newTask.endDate,
      endTime: newTask.endTime || '17:30',
      assignee: newTask.assignee
    };

    if (!this.projectTasks[projectId]) {
      this.projectTasks[projectId] = [];
    }

    this.projectTasks[projectId].push(task);
    this.updateProjectProgress(projectId);
    this.resetTaskForm(projectId);
    this.updateGanttChart();
    this.cdr.markForCheck();
  }

  private getNextTaskId(projectId: number): number {
    const tasks = this.projectTasks[projectId] || [];
    return tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  }

  updateTaskStatus(task: Task | SubProjectTask | undefined) {
    if (!task) return;

    if (this.isSubProjectTask(task)) {
      const bigProjectId = this.getBigProjectIdBySubProjectId(task.subProjectId);
      if (bigProjectId !== undefined) {
        this.updateSubProjectTaskStatus(
          bigProjectId,
          task.subProjectId,
          task.id,
          task.status
        );
      }
    } else {
      const projectTask = task as Task;
      const projectId = projectTask.projectId;
      const taskIndex = this.projectTasks[projectId]?.findIndex(t => t.id === projectTask.id);
      if (taskIndex !== undefined && taskIndex !== -1) {
        this.projectTasks[projectId][taskIndex] = { ...projectTask };
        this.updateProjectProgress(projectId);
      }
    }
    this.updateGanttChart();
    this.cdr.markForCheck();
  }

  private updateProjectProgress(projectId: number) {
    const tasks = this.projectTasks[projectId] || [];
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const progress = tasks.length === 0 ? 0 : 
      Math.round((completedTasks / tasks.length) * 100);

    this.projects = this.projects.map(project => 
      project.id === projectId 
        ? { ...project, progress } 
        : project
    );

    this.cdr.markForCheck();
  }

  resetProjectForm() {
    this.newProject = this.getEmptyProject();
    this.showProjectForm = false;
    this.cdr.markForCheck();
  }

  resetTaskForm(projectId?: number) {
    if (projectId) {
      this.newTasks = {
        ...this.newTasks,
        [projectId]: this.getEmptyTask(projectId)
      };
      this.projectTaskForms = {
        ...this.projectTaskForms,
        [projectId]: false
      };
    } else {
      this.newTasks = {};
      this.projectTaskForms = {};
    }
    this.cdr.markForCheck();
  }

  selectProject(project: Project) {
    this.selectedProject = { ...project };
    this.activePanel = 'tasks';
    this.cdr.markForCheck();
  }

  getProjectTasks(projectId: number | undefined): Task[] {
    if (!projectId) return [];
    return this.projectTasks[projectId] || [];
  }

  trackByProjectId(index: number, project: Project): number {
    return project.id;
  }

  trackByTaskId(index: number, task: Task): number {
    return task.id;
  }

  calculateProjectDuration(project: Project): string {
    if (!project.startDate || !project.endDate) return '';

    const start = new Date(`${project.startDate}T${project.startTime || '00:00'}`);
    const end = new Date(`${project.endDate}T${project.endTime || '00:00'}`);
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    const startStr = `${project.startDate} ${project.startTime || '00:00'}`;
    const endStr = `${project.endDate} ${project.endTime || '00:00'}`;
    const rangeStr = `${startStr} ～ ${endStr}`;
    const durationStr = days > 1 ? `${days}日間` : `${hours}時間`;
    return `${rangeStr}（${durationStr}）`;
  }

  calculateTaskDuration(task: Task): string {
    if (!task.startDate || !task.endDate) return '';

    const start = new Date(`${task.startDate}T${task.startTime || '00:00'}`);
    const end = new Date(`${task.endDate}T${task.endTime || '00:00'}`);
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    const startStr = `${task.startDate} ${task.startTime || '00:00'}`;
    const endStr = `${task.endDate} ${task.endTime || '00:00'}`;
    const rangeStr = `${startStr} ～ ${endStr}`;
    const durationStr = days > 1 ? `${days}日間` : `${hours}時間`;
    return `${rangeStr}（${durationStr}）`;
  }

  // タスク編集関連のメソッド
  editTask(task: Task | SubProjectTask, projectId: number) {
    try {
      // 通常のTaskまたはSubProjectTaskの場合
      if (this.isSubProjectTask(task)) {
        const subProjectTask = task as SubProjectTask;
        this.editingTask = {
          task: { ...subProjectTask },
          projectId: projectId,
          subProjectId: subProjectTask.subProjectId
        };
      } else {
        const regularTask = task as Task;
        this.editingTask = {
          task: { ...regularTask },
          projectId: projectId
        };
      }

      // 変更検知を強制的に実行
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in editTask:', error);
    }
  }

  saveTaskEdit() {
    try {
      if (!this.editingTask) return;

      // Validate required fields
      if (!this.editingTask.task.title) {
        alert('タスク名は必須です');
        return;
      }

      // Validate dates
      if (this.editingTask.task.startDate && this.editingTask.task.endDate) {
        const startDate = new Date(this.editingTask.task.startDate);
        const endDate = new Date(this.editingTask.task.endDate);
        if (endDate < startDate) {
          alert('終了日は開始日より後に設定してください');
          return;
        }
      }

      const editingTask = this.editingTask;
      if (editingTask.subProjectId) {
        // サブプロジェクトタスクの編集
        const bigProject = this.bigProjects.find(bp => bp.id === editingTask.projectId);
        if (!bigProject) return;

        const subProject = bigProject.subProjects.find(sp => sp.id === editingTask.subProjectId);
        if (!subProject) return;

        const taskIndex = subProject.tasks.findIndex(t => t.id === editingTask.task.id);
        if (taskIndex !== -1) {
          subProject.tasks[taskIndex] = { ...editingTask.task } as SubProjectTask;
          this.updateBigProjectProgress(editingTask.projectId);
        }
      } else {
        // 通常のプロジェクトタスクの編集
        const projectTasks = this.projectTasks[editingTask.projectId];
        if (!projectTasks) return;

        const taskIndex = projectTasks.findIndex(t => t.id === editingTask.task.id);
        if (taskIndex !== -1) {
          projectTasks[taskIndex] = { ...editingTask.task } as Task;
          this.updateProjectProgress(editingTask.projectId);
        }
      }

      // ガントチャートを更新
      this.updateGanttChart();

      // 編集状態をリセット
      this.editingTask = null;

      // 変更検知を強制的に実行
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in saveTaskEdit:', error);
    }
  }

  cancelTaskEdit() {
    try {
      // 編集状態をリセット
      this.editingTask = null;
      
      // 変更検知を強制的に実行
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in cancelTaskEdit:', error);
    }
  }

  deleteTask(taskId: number | undefined, projectId: number | undefined) {
    if (!taskId || !projectId) return;
    
    if (!confirm('このタスクを削除してもよろしいですか？')) {
      return;
    }

    const tasks = this.projectTasks[projectId];
    if (tasks) {
      this.projectTasks = {
        ...this.projectTasks,
        [projectId]: tasks.filter(t => t.id !== taskId)
      };
      
      this.updateProjectProgress(projectId);
      this.updateGanttChart();
      this.cdr.markForCheck();
    }
  }

  // プロジェクト編集関連のメソッド
  editProject(project: Project) {
    this.editingProject = { ...project };
    this.cdr.markForCheck();
  }

  cancelProjectEdit() {
    this.editingProject = null;
    this.cdr.markForCheck();
  }

  saveProjectEdit() {
    if (!this.editingProject) return;

    if (!this.editingProject.name || !this.editingProject.startDate || !this.editingProject.endDate) {
      alert('プロジェクト名と期間は必須です');
      return;
    }

    this.projects = this.projects.map(p => 
      p.id === this.editingProject!.id ? { ...this.editingProject! } : p
    );

    if (this.selectedProject?.id === this.editingProject.id) {
      this.selectedProject = { ...this.editingProject };
    }

    this.editingProject = null;
    this.cdr.markForCheck();
  }

  deleteProject(id: number) {
    this.projects = this.projects.filter(p => p.id !== id);
    delete this.projectTasks[id];
    
    if (this.selectedProject?.id === id) {
      this.selectedProject = null;
      this.activePanel = 'projects';
    }
    
    this.cdr.markForCheck();
  }

  getAllTasksByStatus(status: 'not-started' | 'in-progress' | 'completed'): (Task | SubProjectTask)[] {
    // 通常のプロジェクトタスク
    const regularTasks = Object.values(this.projectTasks)
      .flat()
      .filter(task => task.status === status)
      .map(task => ({
        ...task,
        type: 'regular' as const
      }));

    // サブプロジェクトタスク
    const subProjectTasks = this.bigProjects
      .flatMap(bp => bp.subProjects || [])
      .flatMap(sp => (sp.tasks || [])
        .filter(task => task.status === status)
        .map(task => ({
          ...task,
          type: 'subProject' as const,
          projectName: this.getSubProjectName(task.subProjectId),
          bigProjectName: this.getBigProjectNameBySubProjectId(task.subProjectId)
        }))
      );

    return [...regularTasks, ...subProjectTasks];
  }

  getProjectName(projectId: number): string {
    if (projectId === -1) {
      return ''; // サブプロジェクトタスクの場合は空文字を返す
    }
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : '';
  }

  getSubProjectName(subProjectId: number): string {
    for (const bigProject of this.bigProjects) {
      const subProject = bigProject.subProjects?.find(sp => sp.id === subProjectId);
      if (subProject) {
        return subProject.name;
      }
    }
    return '';
  }

  getBigProjectNameBySubProjectId(subProjectId: number): string {
    for (const bigProject of this.bigProjects) {
      const subProject = bigProject.subProjects?.find(sp => sp.id === subProjectId);
      if (subProject) {
        return bigProject.name;
      }
    }
    return '';
  }

  // タスクパネルで全てのタスクを表示するためのメソッド
  getAllTasks(): (Task | SubProjectTask)[] {
    // 通常のプロジェクトのタスク
    const regularTasks = this.projects.flatMap(project => 
      this.getProjectTasks(project.id).map(task => ({
        ...task,
        projectType: 'regular' as const
      }))
    );

    // サブプロジェクトのタスク
    const subProjectTasks = this.bigProjects.flatMap(bp => 
      (bp.subProjects || []).flatMap(sp => 
        (sp.tasks || []).map(task => ({
          ...task,
          projectType: 'subProject' as const,
          bigProjectId: bp.id,
          bigProjectName: bp.name,
          subProjectName: sp.name
        }))
      )
    );

    return [...regularTasks, ...subProjectTasks];
  }

  // ビッグプロジェクト関連のメソッド
  addBigProject() {
    if (!this.newBigProject.name) {
      alert('ビッグプロジェクト名は必須です');
      return;
    }

    const bigProject: BigProject = {
      id: this.nextBigProjectId++,
      name: this.newBigProject.name,
      description: this.newBigProject.description || '',
      startDate: this.newBigProject.startDate,
      endDate: this.newBigProject.endDate,
      budget: this.newBigProject.budget || 0,
      status: this.newBigProject.status || 'planning',
      progress: 0,
      manager: this.newBigProject.manager,
      priority: this.newBigProject.priority || 'low',
      subProjects: []
    };

    this.bigProjects = [...this.bigProjects, bigProject];
    this.resetBigProjectForm();
    this.selectBigProject(bigProject);
    this.cdr.markForCheck();
  }

  selectBigProject(bigProject: BigProject) {
    this.selectedBigProject = { ...bigProject };
    this.currentView = 'bigProject';
    this.cdr.markForCheck();
  }

  deleteBigProject(id: number) {
    this.bigProjects = this.bigProjects.filter(bp => bp.id !== id);
    
    if (this.selectedBigProject?.id === id) {
      this.selectedBigProject = null;
    }
    
    this.cdr.markForCheck();
  }

  resetBigProjectForm() {
    this.newBigProject = {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      budget: 0,
      status: 'planning',
      progress: 0,
      manager: '',
      priority: 'medium',
      subProjects: []
    };
    this.showBigProjectCreateForm = false;
    this.cdr.markForCheck();
  }

  editBigProject(bigProject: BigProject) {
    this.editingBigProject = { ...bigProject };
    this.cdr.markForCheck();
  }

  cancelBigProjectEdit() {
    this.editingBigProject = null;
    this.cdr.markForCheck();
  }

  saveBigProjectEdit() {
    if (!this.editingBigProject) return;

    if (!this.editingBigProject.name) {
      alert('ビッグプロジェクト名は必須です');
      return;
    }

    this.bigProjects = this.bigProjects.map(bp => 
      bp.id === this.editingBigProject!.id ? { ...this.editingBigProject! } : bp
    );

    if (this.selectedBigProject?.id === this.editingBigProject.id) {
      this.selectedBigProject = { ...this.editingBigProject };
    }

    this.editingBigProject = null;
    this.cdr.markForCheck();
  }

  showBigProjectCreateAlert() {
    this.showBigProjectForm = true;
    this.cdr.markForCheck();
  }

  createBigProject() {
    if (!this.newBigProject.name) {
      alert('ビッグプロジェクト名は必須です');
      return;
    }

    const bigProject: BigProject = {
      id: this.nextBigProjectId++,
      name: this.newBigProject.name,
      description: this.newBigProject.description || '',
      startDate: this.newBigProject.startDate,
      endDate: this.newBigProject.endDate,
      budget: this.newBigProject.budget || 0,
      status: this.newBigProject.status || 'planning',
      progress: 0,
      manager: this.newBigProject.manager,
      priority: this.newBigProject.priority || 'low',
      subProjects: []
    };

    this.bigProjects = [...this.bigProjects, bigProject];
    this.resetBigProjectForm();
    this.cdr.markForCheck();
  }

  calculateBigProjectDuration(bigProject: BigProject): string {
    if (!bigProject.startDate || !bigProject.endDate) return '';
    
    const start = new Date(bigProject.startDate);
    const end = new Date(bigProject.endDate);
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${bigProject.startDate} ～ ${bigProject.endDate}（${days}日間）`;
  }

  showSubProjectCreateForm(bigProjectId: number | undefined) {
    if (!bigProjectId) return;

    if (!this.showSubProjectForm[bigProjectId]) {
      this.showSubProjectForm[bigProjectId] = true;
    }

    if (!this.newSubProject[bigProjectId]) {
      this.newSubProject[bigProjectId] = this.getEmptySubProject();
    }
  }

  createSubProject(bigProjectId: number) {
    if (!bigProjectId || !this.newSubProject[bigProjectId]) return;

    const newSubProject: SubProject = {
      id: this.nextSubProjectId++,
      name: this.newSubProject[bigProjectId].name || '',
      description: this.newSubProject[bigProjectId].description,
      startDate: this.newSubProject[bigProjectId].startDate,
      endDate: this.newSubProject[bigProjectId].endDate,
      startTime: this.newSubProject[bigProjectId].startTime,
      endTime: this.newSubProject[bigProjectId].endTime,
      assignee: this.newSubProject[bigProjectId].assignee,
      tasks: []
    };

    const bigProject = this.bigProjects.find(p => p.id === bigProjectId);
    if (!bigProject) return;

    bigProject.subProjects.push(newSubProject);
    this.resetSubProjectForm(bigProjectId);
    this.updateBigProjectProgress(bigProjectId);
  }

  resetSubProjectForm(bigProjectId: number | undefined) {
    if (!bigProjectId) return;
    
    this.showSubProjectForm[bigProjectId] = false;
    this.newSubProject[bigProjectId] = this.getEmptySubProject();
  }

  updateBigProjectProgress(bigProjectId: number) {
    const bigProject = this.bigProjects.find(bp => bp.id === bigProjectId);
    if (!bigProject) return;

    const allTasks = bigProject.subProjects.flatMap(sp => sp.tasks);
    const totalTasks = allTasks.length;
    
    if (totalTasks === 0) {
      bigProject.progress = 0;
      return;
    }

    const completedTasks = allTasks.filter(task => task.status === 'completed').length;
    bigProject.progress = Math.round((completedTasks / totalTasks) * 100);
  }

  deleteSubProject(bigProjectId: number | undefined, subProjectId: number | undefined) {
    if (!bigProjectId || !subProjectId) return;

    const bigProject = this.bigProjects.find(p => p.id === bigProjectId);
    if (!bigProject?.subProjects) return;

    bigProject.subProjects = bigProject.subProjects.filter(sp => sp.id !== subProjectId);
    this.updateBigProjectProgress(bigProjectId);
    this.cdr.markForCheck();
  }

  showSubProjectTaskCreateForm(subProjectId: number | undefined) {
    if (!subProjectId) return;
    if (!this.showSubProjectTaskForm) {
      this.showSubProjectTaskForm = {};
    }
    if (!this.newSubProjectTask) {
      this.newSubProjectTask = {};
    }
    this.showSubProjectTaskForm[subProjectId] = true;
    this.newSubProjectTask[subProjectId] = this.getEmptySubProjectTask();
    this.cdr.markForCheck();
  }

  createSubProjectTask(bigProjectId: number, subProjectId: number | undefined) {
    if (!subProjectId) return;
    
    const task = this.newSubProjectTask[subProjectId];
    if (!task) return;

    const newTask: SubProjectTask = {
      id: this.nextSubProjectTaskId++,
      subProjectId: subProjectId,
      title: task.title || '',
      description: task.description,
      status: 'not-started',
      startDate: task.startDate,
      startTime: task.startTime,
      endDate: task.endDate,
      endTime: task.endTime,
      assignee: task.assignee
    };

    const bigProject = this.bigProjects.find(p => p.id === bigProjectId);
    if (!bigProject) return;

    const subProject = bigProject.subProjects.find(sp => sp.id === subProjectId);
    if (!subProject) return;

    if (!subProject.tasks) {
      subProject.tasks = [];
    }
    subProject.tasks.push(newTask);
    this.resetSubProjectTaskForm(subProjectId);
    this.updateBigProjectProgress(bigProjectId);
  }

  resetSubProjectTaskForm(subProjectId: number | undefined) {
    if (!subProjectId || !this.showSubProjectTaskForm || !this.newSubProjectTask) return;
    this.showSubProjectTaskForm[subProjectId] = false;
    delete this.newSubProjectTask[subProjectId];
    this.cdr.markForCheck();
  }

  updateSubProjectTaskStatus(
    bigProjectId: number,
    subProjectId: number,
    taskId: number,
    newStatus: 'not-started' | 'in-progress' | 'completed'
  ) {
    if (!bigProjectId || !subProjectId || !taskId) return;

    const bigProject = this.bigProjects.find(bp => bp.id === bigProjectId);
    if (!bigProject) return;

    const subProject = bigProject.subProjects.find(sp => sp.id === subProjectId);
    if (!subProject) return;

    const task = subProject.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.status = newStatus;
    this.updateBigProjectProgress(bigProjectId);
  }

  deleteSubProjectTask(
    bigProjectId: number,
    subProjectId: number,
    taskId: number
  ) {
    if (!bigProjectId || !subProjectId || !taskId) return;

    const bigProject = this.bigProjects.find(bp => bp.id === bigProjectId);
    if (!bigProject) return;

    const subProject = bigProject.subProjects.find(sp => sp.id === subProjectId);
    if (!subProject) return;

    const taskIndex = subProject.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    subProject.tasks.splice(taskIndex, 1);
    this.updateBigProjectProgress(bigProjectId);
  }

  calculateSubProjectTaskDuration(task: SubProjectTask | undefined): string {
    if (!task?.startDate || !task?.endDate) return '';

    const start = new Date(`${task.startDate}T${task.startTime || '00:00'}`);
    const end = new Date(`${task.endDate}T${task.endTime || '00:00'}`);
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    const startStr = `${task.startDate} ${task.startTime || '00:00'}`;
    const endStr = `${task.endDate} ${task.endTime || '00:00'}`;
    const rangeStr = `${startStr} ～ ${endStr}`;
    const durationStr = days > 1 ? `${days}日間` : `${hours}時間`;
    return `${rangeStr}（${durationStr}）`;
  }

  getTaskDuration(task: Task | SubProjectTask): string {
    if (!task) return '';

    if (this.isSubProjectTask(task)) {
      return this.calculateSubProjectTaskDuration(task as SubProjectTask);
    }
    return this.calculateTaskDuration(task as Task);
  }

  getTaskProjectName(task: Task | SubProjectTask): string {
    if (!task) return '';

    if (this.isSubProjectTask(task)) {
      const subTask = task as SubProjectTask & { bigProjectName?: string; subProjectName?: string };
      if (subTask.bigProjectName && subTask.subProjectName) {
        return `${subTask.bigProjectName} > ${subTask.subProjectName}`;
      }
      const bigProjectId = this.getBigProjectIdBySubProjectId(subTask.subProjectId);
      const bigProject = this.bigProjects.find(bp => bp.id === bigProjectId);
      const subProject = bigProject?.subProjects?.find(sp => sp.id === subTask.subProjectId);
      return bigProject && subProject ? `${bigProject.name} > ${subProject.name}` : '';
    }
    return this.getProjectName((task as Task).projectId);
  }

  isSubProjectTask(task: Task | SubProjectTask): task is SubProjectTask {
    return 'subProjectId' in task;
  }

  getBigProjectIdBySubProjectId(subProjectId: number | undefined): number | undefined {
    if (!subProjectId) return undefined;
    const bigProject = this.bigProjects.find(bp => 
      bp.subProjects?.some(sp => sp.id === subProjectId)
    );
    return bigProject?.id;
  }

  // サブプロジェクトの編集メソッド
  editSubProject(bigProjectId: number | undefined, subProject: SubProject | undefined) {
    if (!bigProjectId || !subProject) return;
    this.editingSubProject = {
      bigProjectId,
      subProject: { ...subProject }
    };
    this.cdr.markForCheck();
  }

  cancelSubProjectEdit() {
    this.editingSubProject = null;
    this.cdr.markForCheck();
  }

  saveSubProjectEdit() {
    if (!this.editingSubProject?.bigProjectId || !this.editingSubProject?.subProject) return;

    const bigProjectId = this.editingSubProject.bigProjectId;
    const editingSubProject = this.editingSubProject.subProject;
    const bigProject = this.bigProjects.find(bp => bp.id === bigProjectId);
    if (!bigProject) return;

    // Validate required fields
    if (!editingSubProject.name) {
      console.error('サブプロジェクト名は必須です');
      return;
    }

    // Validate dates
    if (editingSubProject.startDate && editingSubProject.endDate) {
      const startDate = new Date(editingSubProject.startDate);
      const endDate = new Date(editingSubProject.endDate);
      if (endDate < startDate) {
        console.error('終了日は開始日より後に設定してください');
        return;
      }
    }

    // Update the subproject properties
    const subProject = bigProject.subProjects.find(sp => sp.id === editingSubProject.id);
    if (!subProject) return;

    subProject.name = editingSubProject.name;
    subProject.description = editingSubProject.description;
    subProject.startDate = editingSubProject.startDate;
    subProject.startTime = editingSubProject.startTime;
    subProject.endDate = editingSubProject.endDate;
    subProject.endTime = editingSubProject.endTime;

    // Reset editing state
    this.editingSubProject = null;
    this.updateBigProjectProgress(bigProjectId);
  }

  // サブプロジェクトタスク編集メソッド
  editSubProjectTask(
    bigProjectId: number,
    subProjectId: number,
    task: SubProjectTask
  ) {
    if (!bigProjectId || !subProjectId || !task) return;

    this.editingSubProjectTask = {
      bigProjectId,
      subProjectId,
      task: { ...task }
    };
  }

  cancelSubProjectTaskEdit() {
    this.editingSubProjectTask = null;
    this.cdr.markForCheck();
  }

  saveSubProjectTaskEdit() {
    if (!this.editingSubProjectTask) return;

    const { bigProjectId, subProjectId, task } = this.editingSubProjectTask;
    const bigProject = this.bigProjects.find(bp => bp.id === bigProjectId);
    if (!bigProject) return;

    const subProject = bigProject.subProjects.find(sp => sp.id === subProjectId);
    if (!subProject) return;

    const taskIndex = subProject.tasks.findIndex(t => t.id === task.id);
    if (taskIndex === -1) return;

    if (!task.title) {
      console.error('タスク名は必須です');
      return;
    }

    // 日付の妥当性チェック
    if (task.startDate && task.endDate) {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      if (endDate < startDate) {
        console.error('終了日は開始日より後に設定してください');
        return;
      }
    }

    subProject.tasks[taskIndex] = { ...task };
    this.editingSubProjectTask = null;
    this.updateBigProjectProgress(bigProjectId);
  }

  // フォームデータを安全に取得・設定するためのメソッド
  getNewTaskProperty(projectId: number | undefined, property: keyof Task): any {
    if (!projectId) return '';
    return this.newTasks[projectId]?.[property] || '';
  }

  setNewTaskProperty(projectId: number | undefined, property: keyof Task, value: any) {
    if (!projectId) return;
    if (!this.newTasks[projectId]) {
      this.newTasks[projectId] = this.getEmptyTask(projectId);
    }
    this.newTasks[projectId] = {
      ...this.newTasks[projectId],
      [property]: value
    };
    this.cdr.markForCheck();
  }

  // タスクのプロパティを安全に取得するためのメソッド
  getTaskProperty(task: Task | SubProjectTask | GanttTask, property: string): any {
    try {
      if (!task) return '';

      // GanttTaskの場合、対応するTaskまたはSubProjectTaskを探す
      if ('name' in task) {
        const ganttTask = task as GanttTask;
        
        // プロジェクトタスクを検索
        for (const pid in this.projectTasks) {
          const tasks = this.projectTasks[pid];
          const foundTask = tasks.find(t => t.id === ganttTask.id);
          if (foundTask) {
            return foundTask[property as keyof Task];
          }
        }

        // サブプロジェクトタスクを検索
        for (const bigProject of this.bigProjects) {
          for (const subProject of bigProject.subProjects) {
            const foundTask = subProject.tasks.find(t => t.id === ganttTask.id);
            if (foundTask) {
              if (property === 'projectId') {
                return bigProject.id;
              }
              return foundTask[property as keyof SubProjectTask];
            }
          }
        }
        return '';
      }

      // 通常のTaskまたはSubProjectTaskの場合
      if (this.isSubProjectTask(task)) {
        const subProjectTask = task as SubProjectTask & { type?: string; projectName?: string; bigProjectName?: string };
        if (property === 'projectId') {
          const bigProject = this.bigProjects.find(bp => 
            bp.subProjects.some(sp => sp.id === subProjectTask.subProjectId)
          );
          return bigProject ? bigProject.id : '';
        }
        return subProjectTask[property as keyof (SubProjectTask & { type?: string; projectName?: string; bigProjectName?: string })] || '';
      } else {
        const regularTask = task as Task & { type?: string };
        return regularTask[property as keyof (Task & { type?: string })] || '';
      }
    } catch (error) {
      console.error('Error in getTaskProperty:', error);
      return '';
    }
  }

  // 新しいタスクの初期化を確実に行うメソッド
  ensureNewTaskExists(projectId: number | undefined): Partial<Task> | null {
    if (!projectId) return null;
    if (!this.newTasks[projectId]) {
      this.newTasks[projectId] = this.getEmptyTask(projectId);
    }
    return this.newTasks[projectId];
  }

  // ガントチャートのタスク位置とサイズを計算するメソッド
  calculateTaskPosition(task: GanttTask): { left: string; width: string; backgroundColor: string } {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const ganttStart = new Date(this.ganttStartDate);

    // 月の日数を取得する関数
    const getDaysInMonth = (date: Date): number => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    // 月の開始からの日数を計算
    const getAbsoluteDays = (date: Date): number => {
      const monthDiff = date.getMonth() - ganttStart.getMonth() + 
                       (date.getFullYear() - ganttStart.getFullYear()) * 12;
      let totalDays = 0;
      
      // 完全な月の日数を加算
      for (let i = 0; i < monthDiff; i++) {
        const currentMonth = new Date(ganttStart.getFullYear(), ganttStart.getMonth() + i, 1);
        totalDays += getDaysInMonth(currentMonth);
      }
      
      // 現在の月の日数を加算
      totalDays += date.getDate() - 1;
      
      return totalDays;
    };

    // 開始日と終了日の絶対日数を計算
    const startDays = getAbsoluteDays(start);
    const endDays = getAbsoluteDays(end);

    // 表示期間の総日数を計算
    const totalDays = getAbsoluteDays(new Date(this.ganttEndDate)) + 1;

    // 位置とサイズを計算
    const left = (startDays / totalDays) * 100;
    const width = ((endDays - startDays + 1) / totalDays) * 100;

    let backgroundColor = '#FFE4B5'; // デフォルト色
    switch (task.status) {
      case 'completed':
        backgroundColor = '#4CAF50'; // 完了：緑
        break;
      case 'in-progress':
        backgroundColor = '#2196F3'; // 進行中：青
        break;
      case 'not-started':
        backgroundColor = '#FFA07A'; // 未着手：オレンジ
        break;
    }

    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor
    };
  }

  // タスクのプロパティを設定するメソッド
  setTaskProperty(task: Task | SubProjectTask, property: string, value: any) {
    if (!task) return;

    // GanttTaskの場合は処理しない
    if ('name' in task) return;

    // プロパティを更新
    (task as any)[property] = value;

    // ステータスが変更された場合、進捗を更新
    if (property === 'status') {
      if (this.isSubProjectTask(task)) {
        const subProjectTask = task as SubProjectTask;
        const bigProjectId = this.getBigProjectIdBySubProjectId(subProjectTask.subProjectId);
        if (bigProjectId !== undefined) {
          this.updateSubProjectTaskStatus(
            bigProjectId,
            subProjectTask.subProjectId,
            subProjectTask.id,
            value
          );
        }
      } else {
        const regularTask = task as Task;
        this.updateTaskStatus(regularTask);
      }
    }

    this.cdr.markForCheck();
  }

  // プロジェクトの進捗率を取得
  getProjectProgress(projectId: number): number {
    const total = this.getTotalTaskCount(projectId);
    if (total === 0) return 0;
    const completed = this.getCompletedTaskCount(projectId);
    return Math.round((completed / total) * 100);
  }

  // プロジェクトの総タスク数を取得
  getTotalTaskCount(projectId: number): number {
    return this.projectTasks[projectId]?.length || 0;
  }

  // プロジェクトの完了タスク数を取得
  getCompletedTaskCount(projectId: number): number {
    return this.projectTasks[projectId]?.filter(t => t.status === 'completed').length || 0;
  }

  calculateChartPoints(data: BurndownData[]): string {
    if (!data.length) return '';
    
    // 開始点（0, 0）と現在の進捗点（100, 最終進捗率）のみを使用
    const finalProgress = data[data.length - 1].completedTasks;
    return `0,0 100,${finalProgress}`;
  }

  calculateIdealPoints(): string {
    // 理想的な進捗ライン（0%から100%へ）
    return '0,0 100,100';
  }

  getYAxisLabels(): number[] {
    // 100%から0%の順で表示
    return [100, 75, 50, 25, 0];
  }

  getGridLinePosition(value: number): string {
    // グリッドラインの位置（100%を下、0%を上に）
    return `${value}%`;
  }

  getFilteredDateLabels(data: BurndownData[]): BurndownData[] {
    // 開始日と終了日のみを表示
    return data;
  }

  updateProjectBurndown(selected: Project | SubProject | null) {
    if (!selected) {
      this.burndownData = [];
      this.burndownStartDate = '';
      this.burndownEndDate = '';
      this.cdr.markForCheck();
      return;
    }

    let tasks: Task[] | SubProjectTask[] = [];
    let startDate: string = '';
    let endDate: string = '';
    let name: string = '';

    if ('projectId' in selected || 'progress' in selected) {
      // Project
      tasks = this.projectTasks[selected.id] || [];
      const rawStart = selected.startDate;
      const rawEnd = selected.endDate;
      startDate = rawStart instanceof Date ? rawStart.toISOString().split('T')[0] : (rawStart || '');
      endDate = rawEnd instanceof Date ? rawEnd.toISOString().split('T')[0] : (rawEnd || '');
      name = selected.name;
    } else {
      // SubProject
      tasks = selected.tasks || [];
      const rawStart = selected.startDate;
      const rawEnd = selected.endDate;
      startDate = rawStart instanceof Date ? rawStart.toISOString().split('T')[0] : (rawStart || '');
      endDate = rawEnd instanceof Date ? rawEnd.toISOString().split('T')[0] : (rawEnd || '');
      name = selected.name;
    }

    if (!startDate || !endDate || tasks.length === 0) {
      this.burndownData = [];
      this.burndownStartDate = '';
      this.burndownEndDate = '';
      this.cdr.markForCheck();
      return;
    }

    // 日付の配列を生成（1日単位）
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 総タスク数と完了タスク数を計算
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const progressPercent = Math.round((completedTasks / totalTasks) * 100);

    // バーンダウンデータを生成（開始点と終了点のみ）
    this.burndownData = [
      {
        date: dates[0],
        plannedTasks: 0,
        completedTasks: 0,
        label: name
      },
      {
        date: dates[dates.length - 1],
        plannedTasks: 100,
        completedTasks: progressPercent,
        label: name
      }
    ];

    // 日付範囲を設定
    this.burndownStartDate = start.toISOString().split('T')[0];
    this.burndownEndDate = end.toISOString().split('T')[0];

    this.cdr.markForCheck();
  }

  // 検索関連のメソッド
  onSearchQueryChange() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // プロジェクトの検索
    if (this.searchFilters.projects) {
      this.projects.forEach(project => {
        if (this.matchesSearch(project.name, project.description, query)) {
          results.push({
            id: project.id,
            title: project.name,
            description: project.description,
            type: 'project',
            typeLabel: 'プロジェクト',
            dates: this.calculateProjectDuration(project),
            status: String(project.progress) + '%'
          });
        }
      });
    }

    // タスクの検索
    if (this.searchFilters.tasks) {
      Object.entries(this.projectTasks).forEach(([projectId, tasks]) => {
        tasks.forEach(task => {
          if (this.matchesSearch(task.title, task.description, query)) {
            const project = this.projects.find(p => p.id === Number(projectId));
            results.push({
              id: task.id,
              title: task.title,
              description: task.description,
              type: 'task',
              typeLabel: 'タスク',
              parent: project ? project.name : '',
              dates: this.calculateTaskDuration(task),
              status: task.status,
              projectId: Number(projectId)
            });
          }
        });
      });
    }

    // ビッグプロジェクトの検索
    if (this.searchFilters.bigProjects) {
      this.bigProjects.forEach(bigProject => {
        if (this.matchesSearch(bigProject.name, bigProject.description, query)) {
          results.push({
            id: bigProject.id,
            title: bigProject.name,
            description: bigProject.description,
            type: 'bigProject',
            typeLabel: 'ビッグプロジェクト',
            dates: this.calculateBigProjectDuration(bigProject),
            status: bigProject.status
          });
        }
      });
    }

    // サブプロジェクトとそのタスクの検索
    if (this.searchFilters.subProjects) {
      this.bigProjects.forEach(bigProject => {
        bigProject.subProjects.forEach(subProject => {
          if (this.matchesSearch(subProject.name, subProject.description, query)) {
            results.push({
              id: subProject.id,
              title: subProject.name,
              description: subProject.description,
              type: 'subProject',
              typeLabel: 'サブプロジェクト',
              parent: bigProject.name,
              dates: this.calculateSubProjectDuration(subProject),
              bigProjectId: bigProject.id
            });
          }

          // サブプロジェクトのタスクも検索
          subProject.tasks.forEach(task => {
            if (this.matchesSearch(task.title, task.description, query)) {
              results.push({
                id: task.id,
                title: task.title,
                description: task.description,
                type: 'subProjectTask',
                typeLabel: 'サブプロジェクトタスク',
                parent: `${bigProject.name} > ${subProject.name}`,
                dates: this.calculateSubProjectTaskDuration(task),
                status: task.status,
                bigProjectId: bigProject.id,
                subProjectId: subProject.id
              });
            }
          });
        });
      });
    }

    this.searchResults = results;
  }

  private matchesSearch(title?: string, description?: string, query?: string): boolean {
    if (!query) return false;
    return (
      (title?.toLowerCase().includes(query) || false) ||
      (description?.toLowerCase().includes(query) || false)
    );
  }

  calculateSubProjectDuration(subProject: SubProject): string {
    if (!subProject.startDate || !subProject.endDate) return '';
    
    const start = new Date(subProject.startDate);
    const end = new Date(subProject.endDate);
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${subProject.startDate} ～ ${subProject.endDate}（${days}日間）`;
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'not-started': '未着手',
      'in-progress': '進行中',
      'completed': '完了',
      'planning': '計画中',
      'active': '進行中',
      'on-hold': '保留中'
    };
    return statusMap[status] || status;
  }

  navigateToResult(result: SearchResult) {
    switch (result.type) {
      case 'project':
        this.currentView = 'list';
        this.activePanel = 'projects';
        const project = this.projects.find(p => p.id === result.id);
        if (project) {
          this.selectProject(project);
        }
        break;
      
      case 'task':
        this.currentView = 'list';
        this.activePanel = 'tasks';
        break;
      
      case 'bigProject':
        this.currentView = 'bigProject';
        const bigProject = this.bigProjects.find(bp => bp.id === result.id);
        if (bigProject) {
          this.selectBigProject(bigProject);
        }
        break;
      
      case 'subProject':
      case 'subProjectTask':
        this.currentView = 'bigProject';
        break;
    }
    this.cdr.markForCheck();
  }

  editSearchResult(result: SearchResult) {
    switch (result.type) {
      case 'project':
        const project = this.projects.find(p => p.id === result.id);
        if (project) {
          this.editProject(project);
        }
        break;
      
      case 'task':
        if (result.projectId) {
          const tasks = this.projectTasks[result.projectId];
          const task = tasks?.find(t => t.id === result.id);
          if (task) {
            this.editTask(task, result.projectId);
          }
        }
        break;
      
      case 'bigProject':
        const bigProject = this.bigProjects.find(bp => bp.id === result.id);
        if (bigProject) {
          this.editBigProject(bigProject);
        }
        break;
      
      case 'subProject':
        if (result.bigProjectId) {
          const bp = this.bigProjects.find(bp => bp.id === result.bigProjectId);
          const subProject = bp?.subProjects.find(sp => sp.id === result.id);
          if (bp && subProject) {
            this.editSubProject(bp.id, subProject);
          }
        }
        break;
      
      case 'subProjectTask':
        if (result.bigProjectId && result.subProjectId) {
          const bp = this.bigProjects.find(bp => bp.id === result.bigProjectId);
          const sp = bp?.subProjects.find(sp => sp.id === result.subProjectId);
          const task = sp?.tasks.find(t => t.id === result.id);
          if (task) {
            this.editSubProjectTask(result.bigProjectId, result.subProjectId, task);
          }
        }
        break;
    }
  }

  // アカウント関連のメソッド
  private loadUsers() {
    // 開発用のテストユーザーを作成
    this.users = [
      {
        id: this.nextUserId++,
        username: 'admin',
        password: 'admin123',  // 実際のアプリケーションではハッシュ化します
        role: 'admin',
        createdAt: new Date()
      }
    ];
  }

  private checkStoredAuth() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.cdr.markForCheck();
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }

  showLogin() {
    this.showLoginForm = true;
    this.showRegisterForm = false;
    this.loginError = '';
    this.loginForm = {
      username: '',
      password: '',
      rememberMe: false
    };
    this.cdr.markForCheck();
  }

  showRegister() {
    this.showRegisterForm = true;
    this.showLoginForm = false;
    this.registerError = '';
    this.registerForm = {
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    };
    this.cdr.markForCheck();
  }

  login() {
    this.loginError = '';

    // 入力検証
    if (!this.loginForm.username || !this.loginForm.password) {
      this.loginError = 'メールアドレスとパスワードを入力してください。';
      return;
    }

    // ユーザー認証
    const user = this.users.find(u => 
      u.username === this.loginForm.username && 
      u.password === this.loginForm.password  // 実際のアプリケーションではハッシュ比較
    );

    if (!user) {
      this.loginError = 'メールアドレスまたはパスワードが正しくありません。';
      return;
    }

    // ログイン成功
    this.currentUser = user;
    this.currentUser.lastLogin = new Date();
    
    if (this.loginForm.rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    this.showLoginForm = false;
    this.cdr.markForCheck();
  }

  register() {
    this.registerError = '';

    // 入力検証
    if (!this.registerForm.username || !this.registerForm.password || 
        !this.registerForm.confirmPassword) {
      this.registerError = '必須項目を入力してください。';
      return;
    }

    if (this.registerForm.password !== this.registerForm.confirmPassword) {
      this.registerError = 'パスワードが一致しません。';
      return;
    }

    // メールアドレスの重複チェック
    if (this.users.some(u => u.username === this.registerForm.username)) {
      this.registerError = 'このメールアドレスは既に登録されています。';
      return;
    }

    // ユーザー作成
    const newUser: User = {
      id: this.nextUserId++,
      username: this.registerForm.username,
      password: this.registerForm.password,  // 実際のアプリケーションではハッシュ化
      firstName: this.registerForm.firstName,
      lastName: this.registerForm.lastName,
      role: 'user',
      createdAt: new Date()
    };

    this.users.push(newUser);
    
    // 自動ログイン
    this.currentUser = newUser;
    this.currentUser.lastLogin = new Date();
    
    this.showRegisterForm = false;
    this.cdr.markForCheck();
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.cdr.markForCheck();
  }

  // ガントチャート用のタスク編集メソッド
  editGanttTask(task: GanttTask, projectId: number) {
    try {
      // プロジェクトタスクを検索
      for (const pid in this.projectTasks) {
        const tasks = this.projectTasks[pid];
        const foundTask = tasks.find(t => t.id === task.id);
        if (foundTask) {
          this.editingTask = {
            task: { ...foundTask },
            projectId: Number(pid)
          };
          break;
        }
      }

      // サブプロジェクトタスクを検索
      if (!this.editingTask) {
        for (const bigProject of this.bigProjects) {
          for (const subProject of bigProject.subProjects) {
            const foundTask = subProject.tasks.find(t => t.id === task.id);
            if (foundTask) {
              this.editingTask = {
                task: { ...foundTask },
                projectId: bigProject.id,
                subProjectId: subProject.id
              };
              break;
            }
          }
          if (this.editingTask) break;
        }
      }

      // 変更検知を強制的に実行
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in editGanttTask:', error);
    }
  }

  // GanttTaskから元のタスクを取得するメソッド
  getOriginalTask(ganttTask: GanttTask): Task | SubProjectTask {
    // プロジェクトタスクを検索
    for (const pid in this.projectTasks) {
      const tasks = this.projectTasks[pid];
      const foundTask = tasks.find(t => t.id === ganttTask.id);
      if (foundTask) {
        return foundTask;
      }
    }

    // サブプロジェクトタスクを検索
    for (const bigProject of this.bigProjects) {
      for (const subProject of bigProject.subProjects) {
        const foundTask = subProject.tasks.find(t => t.id === ganttTask.id);
        if (foundTask) {
          return foundTask;
        }
      }
    }

    // タスクが見つからない場合は、最低限必要なプロパティを持つオブジェクトを返す
    return {
      id: ganttTask.id,
      title: ganttTask.name,
      status: ganttTask.status,
      startDate: ganttTask.startDate,
      endDate: ganttTask.endDate,
      assignee: ganttTask.assignee,
      projectId: -1  // 仮のプロジェクトID
    } as Task;
  }

  // テンプレートボタン用メソッド
  applyProjectTemplate() {
    this.newProject = {
      name: 'テンプレートプロジェクト',
      description: 'これはテンプレートから作成されたプロジェクトです。',
      startDate: '2024-07-01',
      startTime: '09:00',
      endDate: '2024-07-31',
      endTime: '17:30',
      category: 'テンプレート',
      tags: [],
      progress: 0,
      assignee: 'テンプレ担当'
    };
    this.showProjectForm = true;
    this.cdr.markForCheck();
  }

  applyTaskTemplate(project: Project) {
    this.ensureNewTaskExists(project.id);
    this.newTasks[project.id] = {
      title: 'テンプレートタスク',
      description: 'これはテンプレートから作成されたタスクです。',
      status: 'not-started',
      startDate: '2024-07-01',
      startTime: '09:00',
      endDate: '2024-07-07',
      endTime: '17:30',
      assignee: 'テンプレ担当',
      projectId: project.id
    };
    this.projectTaskForms[project.id] = true;
    this.cdr.markForCheck();
  }

  getSubProjectProgress(subProject: SubProject): number {
    const total = subProject.tasks?.length || 0;
    if (total === 0) return 0;
    const completed = subProject.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }

  // 型ガード: SubProjectかどうか判定
  isSubProject(obj: any): obj is SubProject {
    return obj && Array.isArray(obj.tasks);
  }

  // サブプロジェクトの完了タスク数
  getSubProjectCompletedTaskCount(subProject: SubProject): number {
    return subProject.tasks?.filter(t => t.status === 'completed').length || 0;
  }
  // サブプロジェクトの残タスク数
  getSubProjectRemainingTaskCount(subProject: SubProject): number {
    return (subProject.tasks?.length || 0) - this.getSubProjectCompletedTaskCount(subProject);
  }
}
