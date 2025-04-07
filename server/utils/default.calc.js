export const defaultCalcs = {
  1735048: {
    name: "Recarga Combustible",
    counters: [
      {
        name: "fuel.before",
        type: "expression",
        method: "first",
        expression:
          'if(exists("custom.par158"), custom.par158 * 0.02685, if(exists("can.fuel.level"), ((can.fuel.level * 0.01) * 21.1), null))',
        validate_message: "can.vehicle.speed < 2",
      },
      {
        name: "fuel.after",
        type: "expression",
        method: "last",
        expression:
          'if(exists("custom.par158"), custom.par158 * 0.02685, if(exists("can.fuel.level"), ((can.fuel.level * 0.01) * 21.1), null))',
        validate_message: "can.vehicle.speed < 2",
      },
      {
        name: "fuel.delta",
        type: "interval",
        expression: "fuel.after-fuel.before",
      },
      {
        name: "position.latitude",
        type: "parameter",
        method: "first",
      },
      {
        name: "position.longitude",
        type: "parameter",
        method: "first",
      },
      {
        name: "odometer",
        type: "expression",
        method: "first",
        expression:
          'if(exists("custom.par153"), custom.par153 * 0.005, if(exists("can.vehicle.mileage"), can.vehicle.mileage, vehicle.mileage))',
      },
      {
        name: "device.id",
        type: "parameter",
        method: "first",
        parameter: "device.id",
      },
      {
        name: "imei",
        type: "parameter",
        method: "first",
        parameter: "ident",
      },
      {
        name: "device.name",
        type: "parameter",
        method: "first",
        parameter: "device.name",
      },
      {
        name: "driver.id",
        type: "parameter",
        method: "distinct",
        parameter: "rfid.code",
      },
      {
        name: "rfid.validation",
        type: "active",
      },
    ],
    metadata: {},
    timezone: "America/Lima",
    selectors: [
      {
        name: "fuel increased",
        type: "expression",
        method: "boolean",
        expression: "#can.fuel.level<can.fuel.level",
        max_inactive: 90,
        min_duration: 30,
        merge_unknown: true,
        validate_message: "can.engine.ignition.status == 1",
        merge_message_before: true,
        max_messages_time_diff: 1800,
      },
    ],
    update_delay: 1,
    intervals_ttl: 31536000,
    update_period: 86400,
    messages_source: {
      source: "device",
    },
    update_onchange: true,
    intervals_rotate: 0,
    validate_message: "",
    validate_interval: "fuel.delta>3",
  },
  1735049: {
    name: "Consumo Combustible dia",
    counters: [
      {
        name: "odometer.start",
        type: "expression",
        method: "first",
        expression:
          'if(exists("custom.par153"), custom.par153 * 0.005, if(exists("can.vehicle.mileage"), can.vehicle.mileage, vehicle.mileage))',
      },
      {
        name: "odometer.end",
        type: "expression",
        method: "last",
        expression:
          'if(exists("custom.par153"), custom.par153 * 0.005, if(exists("can.vehicle.mileage"), can.vehicle.mileage, vehicle.mileage))',
      },
      {
        name: "odometer.total",
        type: "interval",
        expression: "odometer.end - odometer.start",
      },
      {
        name: "fuel.start.liters",
        type: "parameter",
        method: "first",
        parameter: "can.fuel.consumed",
      },
      {
        name: "fuel.start",
        type: "interval",
        expression: "fuel.start.liters/3.785",
      },
      {
        name: "fuel.end.liters",
        type: "parameter",
        method: "last",
        parameter: "can.fuel.consumed",
      },
      {
        name: "fuel.end",
        type: "interval",
        expression: "fuel.end.liters/3.785",
      },
      {
        name: "fuel.total.day",
        type: "interval",
        expression: "fuel.end - fuel.start",
      },
      {
        name: "device.id",
        type: "parameter",
        method: "first",
        parameter: "device.id",
      },
      {
        name: "imei",
        type: "parameter",
        method: "first",
        parameter: "ident",
      },
      {
        name: "device.name",
        type: "parameter",
        method: "first",
        parameter: "device.name",
      },
      {
        name: "driver.id",
        type: "parameter",
        method: "distinct",
        parameter: "rfid.code",
      },
      {
        name: "driver.validation",
        type: "active",
      },
    ],
    metadata: {},
    timezone: "America/Lima",
    selectors: [
      {
        name: "day.period",
        type: "datetime",
        split: "day",
      },
    ],
    update_delay: 10,
    intervals_ttl: 31536000,
    update_period: 86400,
    messages_source: {
      source: "device",
    },
    update_onchange: true,
    intervals_rotate: 0,
    validate_message: "",
    validate_interval: "",
  },
  1735050: {
    name: "Seguridad Dispositivos",
    counters: [
      {
        name: "device.name",
        type: "parameter",
        method: "first",
        parameter: "device.name",
      },
      {
        name: "device.id",
        type: "parameter",
        method: "first",
        parameter: "device.id",
      },
      {
        name: "imei",
        type: "parameter",
        method: "first",
        parameter: "ident",
      },
      {
        name: "server.key",
        type: "route",
      },
      {
        name: "ssl",
        type: "specified",
        value: "true",
      },
      {
        name: "ip.peer",
        type: "parameter",
        method: "first",
        parameter: "peer",
      },
      {
        name: "operador",
        type: "message",
        fields: ["gsm.mcc", "gsm.mnc"],
        method: "first",
      },
      {
        name: "date",
        type: "datetime",
        format: "%c",
        interval: "end",
      },
    ],
    metadata: {},
    timezone: "America/Lima",
    selectors: [
      {
        type: "datetime",
        split: "day",
      },
    ],
    update_delay: 30,
    intervals_ttl: 259200,
    update_period: 864000,
    messages_source: {
      source: "device",
    },
    update_onchange: true,
    intervals_rotate: 0,
    validate_message: "",
    validate_interval: "",
  },
  1735051: {
    name: "Paradas",
    counters: [
      {
        name: "route",
        type: "route",
      },
      {
        name: "driver.id",
        type: "parameter",
        method: "distinct",
        parameter: "rfid.code",
      },
      {
        name: "device.name",
        type: "parameter",
        method: "first",
        parameter: "device.name",
      },
      {
        name: "date.begin",
        type: "datetime",
        format: "%c",
        interval: "begin",
      },
      {
        name: "date.end",
        type: "datetime",
        format: "%c",
        interval: "end",
      },
      {
        name: "device.id",
        type: "parameter",
        method: "first",
        parameter: "device.id",
      },
      {
        name: "duration.min",
        type: "interval",
        expression: "duration /60",
      },
      {
        name: "encendido.sec",
        type: "expression",
        method: "duration",
        expression: "can.engine.ignition.status == true",
      },
      {
        name: "encendido",
        type: "interval",
        expression: "encendido.sec / 60",
      },
      {
        name: "apagado.sec",
        type: "expression",
        method: "duration",
        expression: "can.engine.ignition.status == false",
      },
      {
        name: "apagado",
        type: "interval",
        expression: "apagado.sec / 60",
      },
    ],
    metadata: {},
    timezone: "UTC",
    selectors: [
      {
        type: "expression",
        method: "boolean",
        expression: "position.speed<5",
        min_active: 120,
        min_duration: 5,
      },
    ],
    update_delay: 10,
    intervals_ttl: 31536000,
    update_period: 31536000,
    messages_source: {
      source: "device",
    },
    update_onchange: true,
    intervals_rotate: 0,
    validate_message: "position.speed",
    validate_interval: "",
  },
  1735052: {
    name: "Vehiculos",
    counters: [
      {
        name: "device.name",
        type: "parameter",
        method: "first",
        parameter: "device.name",
      },
    ],
    metadata: {},
    timezone: "UTC",
    selectors: [
      {
        type: "datetime",
        split: "day",
      },
    ],
    update_delay: 30,
    intervals_ttl: 31536000,
    update_period: 864000,
    messages_source: {
      source: "device",
    },
    update_onchange: true,
    intervals_rotate: 0,
    validate_message: "",
    validate_interval: "",
  },
};
