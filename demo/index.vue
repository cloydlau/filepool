<template>
  <el-dialog :visible.sync="showDialog" :close-on-click-modal="false" title="Filepool">


    <Filepool v-model="value"
              :fileType="fileType"
              :count="count"
              :valueType="valueType"
              :maxSize="maxSize"
              :param="param"
              :disabled="disabled"
    />


    <el-form>
      <h2>props</h2>
      <el-form-item label="指定文件类型(范围) 可选项为全局配置中fileTypeMap的key 单个用String多个用Array">
        <el-radio v-model="fileType" label="video">视频</el-radio>
        <el-radio v-model="fileType" label="audio">音频</el-radio>
      </el-form-item>
      <el-form-item label="数据类型 默认单个String多个Array 不区分大小写">
        <el-radio v-model="valueType" :label="undefined">自动</el-radio>
        <el-radio v-model="valueType" label="String">String</el-radio>
        <el-radio v-model="valueType" label="Array">Array</el-radio>
      </el-form-item>
      <el-form-item label="大小限制 单位MB">
        <el-input-number v-model="maxSize" clearable :min="0"/>
      </el-form-item>
      <el-form-item label="数量限制">
        <el-input-number v-model="count" clearable :min="1"/>
      </el-form-item>
      <el-form-item label="上传接口参数 会与全局注册时传入的param进行混入（同名的参数会被这里覆盖）">
        <el-input :value="JSON.stringify(param)"/>
      </el-form-item>
      <el-form-item label="是否禁用">
        <el-switch v-model="disabled"
                   active-color="#13ce66"
                   :active-value="true"
                   :inactive-value="false">
        </el-switch>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script>
export default {
  data () {
    return {
      value: '',
      param: {},
      fileType: undefined,
      maxSize: undefined,
      count: 1,
      valueType: undefined,
      disabled: false,

      showDialog: true
    }
  },
  methods: {}
}
</script>

<style lang="scss" scoped>
.el-form {
  border: 2px solid lightblue;
  border-radius: 16px;
  padding: 16px;
  margin-top: 32px;
}
</style>
