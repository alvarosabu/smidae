export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  sort: number | null
}

export interface Tag {
  id: string
  name: string
}

export interface FeatureItem {
  title: string
  description: string
  icon?: string
}

export interface SpecItem {
  label: string
  value: string
}

export interface DirectusFile {
  id: string
  filename_download: string
  title: string | null
  description: string | null
  type: string
  filesize: number
  width: number | null
  height: number | null
}

export interface Component {
  id: string
  status: 'draft' | 'published' | 'archived'
  date_created: string
  date_updated: string
  name: string
  slug: string
  availability: 'available' | 'eol' | 'discontinued'
  category: string | Category | null
  manufacturer: string | null
  part_number: string | null
  quantity: number
  location: string | null
  price: number | null
  overview: string | null
  features: FeatureItem[] | null
  specs: SpecItem[] | null
  thumbnail: DirectusFile | string | null
  gallery: Array<{ id: string, components_id?: string, directus_files_id: DirectusFile | string }>
  datasheets: Array<{ id: string, components_id?: string, directus_files_id: DirectusFile | string }>
  tags: Array<{ id: string, components_id?: string, tags_id: Tag | string }>
}

export interface Tutorial {
  id: string
  status: 'draft' | 'published' | 'archived'
  date_created: string
  date_updated: string
  date_published: string | null
  title: string
  slug: string
  summary: string | null
  cover: DirectusFile | string | null
  content: string | null
  components: Array<{ id: string, tutorials_id?: string, components_id: Component | string }>
}

export interface ProjectComponent {
  id: string
  projects_id?: string
  components_id: Component | string
  quantity: number
}

export interface Project {
  id: string
  status: 'draft' | 'published' | 'archived'
  date_created: string
  date_updated: string
  title: string
  slug: string
  summary: string | null
  content: string | null
  thumbnail: DirectusFile | string | null
  gallery: Array<{ id: string, projects_id?: string, directus_files_id: DirectusFile | string }>
  components: ProjectComponent[]
}

export interface Schema {
  categories: Category[]
  tags: Tag[]
  components: Component[]
  tutorials: Tutorial[]
  projects: Project[]
}
