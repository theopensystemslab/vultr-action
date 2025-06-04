declare module "@vultr/vultr-node" {
  function initialize(options: { apiKey: string }): Vultr;

  interface Vultr {
    dns: {
      listRecords: (parameters: {
        "dns-domain": string;
        per_page: number;
        cursor?: string;
      }) => Promise<RecordListWrapper>;

      createRecord: (parameters: {
        "dns-domain": string;
        name: string;
        type: "A" | "CNAME";
        data: string;
      }) => Promise<RecordWrapper>;

      deleteRecord: (parameters: {
        "dns-domain": string;
        "record-id": string;
      }) => Promise<void>;
    };

    instances: {
      createInstance: (parameters: {
        region: string;
        plan: string;
        os_id: string;
        label: string;
        hostname: string;
        tags: string[];
        sshkey_id?: string[];
      }) => Promise<InstanceWrapper>;

      listInstances: (parameters: {
        region: string;
        per_page: string;
        cursor?: string;
      }) => Promise<InstanceListWrapper>;

      deleteInstance: (parameters: { "instance-id": string }) => Promise<void>;

      getInstance: (parameters: {
        "instance-id": string;
      }) => Promise<InstanceWrapper>;
    };
  }

  interface InstanceListWrapper {
    instances: Instance[];
    meta: Meta;
  }

  interface InstanceWrapper {
    instance: Instance;
  }

  interface Instance {
    id: string;
    os: string;
    ram: number;
    disk: number;
    main_ip: string;
    vcpu_count: number;
    region: string;
    plan: string;
    date_created: string;
    status: string;
    allowed_bandwidth: number;
    netmask_v4: string;
    gateway_v4: string;
    power_status: string;
    server_status: string;
    v6_network: string;
    v6_main_ip: string;
    v6_network_size: number;
    label: string;
    internal_ip: string;
    kvm: string;
    tag: string;
    tags: string[];
    os_id: number;
    app_id: number;
    image_id: string;
    firewall_group_id: string;
    features: any[];
    default_password: string;
  }

  interface RecordListWrapper {
    records: Record[];
    meta: Meta;
  }

  interface RecordWrapper {
    record: Record;
  }

  interface Record {
    id: string;
    type: string;
    name: string;
    data: string;
    priority: number;
    ttl: number;
  }

  interface Meta {
    links?: {
      next: string;
    };
  }
}
